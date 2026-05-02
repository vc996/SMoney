const { LoanService } = require("../service/loan.service");
const { TransactionService, TX_TYPES } = require("../service/transaction.service");
const { UserService } = require("../service/user.service");
const { KycService } = require("../service/kyc.service");
const { ConfigService } = require("../service/config.service");
const { TierService } = require("../service/tier.service");
const { validateCreateLoan, validateRepay } = require("../utils/validators");
const { calcLateFee } = require("../utils/interest");

const loanSvc   = new LoanService();
const txSvc     = new TransactionService();
const userSvc   = new UserService();
const kycSvc    = new KycService();
const configSvc = new ConfigService();
const tierSvc   = new TierService();

// ─── POST: create_loan ─────────────────────────────────────────────────────
async function createLoanHandler({ payload, res, log, error }) {
    const { userId, amount, currency = "VND", termMonths, note } = payload;

    // Lấy config, tiers, user và kyc song song
    const [config, tiers, , kyc] = await Promise.all([
        configSvc.get().catch(() => null),
        tierSvc.getAll().catch(() => []),
        userSvc.getOrCreate(userId),   // đảm bảo user tồn tại
        kycSvc.getByUser(userId),
    ]);

    // KYC phải được duyệt (nguồn duy nhất: kyc_submissions)
    if (kyc?.status !== "approved")
        return res.json({
            success:     false,
            message:     "Bạn cần xác minh danh tính (KYC) trước khi tạo khoản vay",
            requiresKyc: true,
        }, 403);

    // Validate số tiền, kỳ hạn
    const errors = validateCreateLoan({ amount, currency, termMonths }, config ?? {});
    if (errors.length) return res.json({ success: false, message: errors[0] }, 400);

    // Lấy lãi suất từ tier (theo mức vay × kỳ hạn), fallback về config term rate
    const tierRate  = tierSvc.rateFor(tiers, amount, termMonths);
    const termCfg   = (config?.terms ?? []).find(t => t.months === termMonths);
    const interestRate = tierRate ?? termCfg?.rate ?? null;

    try {
        const loan = await loanSvc.create({ borrowerId: userId, amount, currency, termMonths, interestRate, note });
        log(`Loan PENDING: ${loan.$id} by ${userId}`);
        return res.json({
            success: true,
            message: "Đơn vay đã được gửi, chờ admin xét duyệt",
            loan:    loanSvc.format(loan),
        });
    } catch (err) {
        error("createLoan: " + err.message);
        return res.json({ success: false, message: "Không thể tạo khoản vay" }, 500);
    }
}

// ─── POST: approve_loan (admin) ────────────────────────────────────────────
async function approveLoanHandler({ payload, res, log, error }) {
    const { adminKey, loanId } = payload;

    if (adminKey !== process.env.ADMIN_KEY)
        return res.json({ success: false, message: "Không có quyền admin" }, 403);
    if (!loanId)
        return res.json({ success: false, message: "Thiếu loanId" }, 400);

    try {
        const approved    = await loanSvc.approve(loanId);
        const borrowerId  = approved.borrowerId;

        // Ghi giao dịch giải ngân + cập nhật thống kê song song
        await Promise.all([
            txSvc.record({
                loanId,
                userId: borrowerId,
                type:   TX_TYPES.DISBURSEMENT,
                amount: approved.amount,
                note:   `Giải ngân khoản vay ${approved.termMonths} tháng`,
            }),
            userSvc.incrementStats(borrowerId, { borrowed: approved.amount, activeLoans: 1 }),
        ]);

        log(`Loan APPROVED: ${loanId}`);
        return res.json({ success: true, message: "Duyệt khoản vay thành công", loan: loanSvc.format(approved) });
    } catch (err) {
        error("approveLoan: " + err.message);
        return res.json({ success: false, message: err.message || "Lỗi server" }, 500);
    }
}

// ─── POST: reject_loan (admin) ─────────────────────────────────────────────
async function rejectLoanHandler({ payload, res, log, error }) {
    const { adminKey, loanId, reason } = payload;

    if (adminKey !== process.env.ADMIN_KEY)
        return res.json({ success: false, message: "Không có quyền admin" }, 403);
    if (!loanId)
        return res.json({ success: false, message: "Thiếu loanId" }, 400);

    try {
        const rejected = await loanSvc.reject(loanId, reason);
        log(`Loan REJECTED: ${loanId} — ${reason || "no reason"}`);
        return res.json({ success: true, message: "Từ chối khoản vay thành công", loan: loanSvc.format(rejected) });
    } catch (err) {
        error("rejectLoan: " + err.message);
        return res.json({ success: false, message: err.message || "Lỗi server" }, 500);
    }
}

// ─── POST: repay ───────────────────────────────────────────────────────────
async function repayHandler({ payload, res, log, error }) {
    const { userId, loanId, amount } = payload;

    const errors = validateRepay({ loanId, amount });
    if (errors.length) return res.json({ success: false, message: errors[0] }, 400);

    try {
        const loan = await loanSvc.getById(loanId);

        if (loan.borrowerId !== String(userId))
            return res.json({ success: false, message: "Không có quyền truy cập khoản vay này" }, 403);

        if (!["ACTIVE", "OVERDUE"].includes(loan.status))
            return res.json({ success: false, message: `Khoản vay đang ở trạng thái ${loan.status}` }, 400);

        // Tính phí phạt nếu trả trễ
        let lateFee = 0;
        const now     = new Date();
        const nextDue = loan.nextPaymentDate ? new Date(loan.nextPaymentDate) : null;
        if (nextDue && now > nextDue) {
            const daysLate = Math.floor((now - nextDue) / 86_400_000);
            lateFee = calcLateFee(loan.monthlyPayment, daysLate);
        }

        const totalPay  = amount + lateFee;
        const updated   = await loanSvc.repay(loanId, totalPay);

        // Ghi giao dịch (phí phạt ghi riêng nếu có)
        const txPromises = [
            txSvc.record({
                loanId,
                userId,
                type:   TX_TYPES.REPAYMENT,
                amount: totalPay,
                note:   lateFee > 0
                    ? `Kỳ ${updated.installmentsPaid} + phí phạt ${lateFee.toLocaleString()}`
                    : `Kỳ ${updated.installmentsPaid}`,
            }),
        ];
        if (lateFee > 0) {
            txPromises.push(txSvc.record({
                loanId, userId,
                type:   TX_TYPES.PENALTY,
                amount: lateFee,
                note:   "Phí phạt chậm thanh toán",
            }));
        }

        // Cập nhật thống kê user + xử lý hoàn thành khoản vay
        const statsUpdate = userSvc.incrementStats(userId, { repaid: totalPay });
        const postComplete = updated.status === "COMPLETED"
            ? Promise.all([
                statsUpdate,
                userSvc.incrementStats(userId, { activeLoans: -1 }),
                userSvc.updateCreditScore(userId, +50),
              ])
            : statsUpdate;

        await Promise.all([...txPromises, postComplete]);

        log(`Repay loan ${loanId}: ${totalPay} (fee: ${lateFee})`);
        return res.json({
            success: true,
            message: updated.status === "COMPLETED"
                ? "Chúc mừng! Đã trả hết khoản vay!"
                : `Trả kỳ ${updated.installmentsPaid} thành công`,
            loan:    loanSvc.format(updated),
            payment: { amount, lateFee, total: totalPay },
        });
    } catch (err) {
        error("repay: " + err.message);
        return res.json({ success: false, message: "Không thể xử lý thanh toán" }, 500);
    }
}

// ─── GET: get_loan ─────────────────────────────────────────────────────────
async function getLoanHandler({ payload, res, error }) {
    const { userId, loanId } = payload;
    if (!loanId) return res.json({ success: false, message: "Thiếu loanId" }, 400);
    try {
        const loan = await loanSvc.getById(loanId);
        if (loan.borrowerId !== String(userId))
            return res.json({ success: false, message: "Không có quyền xem khoản vay này" }, 403);
        return res.json({ success: true, loan: loanSvc.format(loan) });
    } catch (err) {
        if (err.code === 404) return res.json({ success: false, message: "Khoản vay không tồn tại" }, 404);
        error("getLoan: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

// ─── GET: get_loans ────────────────────────────────────────────────────────
async function getLoansHandler({ payload, res, error }) {
    const { userId, status, limit = 20, offset = 0 } = payload;
    try {
        const result = await loanSvc.getByBorrower(userId, { status, limit, offset });
        return res.json({
            success: true,
            loans:   result.documents.map(l => loanSvc.format(l)),
            total:   result.total,
        });
    } catch (err) {
        error("getLoans: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

// ─── GET: get_transactions ─────────────────────────────────────────────────
async function getTransactionsHandler({ payload, res, error }) {
    const { userId, loanId, limit = 50, offset = 0 } = payload;
    try {
        const result = loanId
            ? await txSvc.getByLoan(loanId, { limit, offset })
            : await txSvc.getByUser(userId, { limit, offset });

        const transactions = result.documents.map(t => txSvc.format(t));

        const summary = transactions.reduce(
            (acc, tx) => {
                if (tx.type === "DISBURSEMENT") acc.totalIn  += tx.amount;
                if (tx.type === "REPAYMENT")    acc.totalOut += tx.amount;
                if (tx.type === "PENALTY")      acc.totalFee += tx.amount;
                return acc;
            },
            { totalIn: 0, totalOut: 0, totalFee: 0 }
        );

        return res.json({ success: true, transactions, summary, total: result.total });
    } catch (err) {
        error("getTransactions: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

// ─── POST: update_loan_status (admin) ──────────────────────────────────────
async function updateLoanStatusHandler({ payload, res, log, error }) {
    const { adminKey, loanId, status } = payload;
    const VALID = ["ACTIVE", "COMPLETED", "OVERDUE", "CANCELLED"];

    if (adminKey !== process.env.ADMIN_KEY)
        return res.json({ success: false, message: "Không có quyền admin" }, 403);
    if (!VALID.includes(status))
        return res.json({ success: false, message: `Status phải là: ${VALID.join(", ")}` }, 400);

    try {
        await loanSvc.updateStatus(loanId, status);
        log(`Loan ${loanId} → ${status}`);
        return res.json({ success: true, message: `Cập nhật trạng thái thành ${status}` });
    } catch (err) {
        error("updateLoanStatus: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

module.exports = {
    createLoanHandler,
    approveLoanHandler,
    rejectLoanHandler,
    repayHandler,
    getLoanHandler,
    getLoansHandler,
    getTransactionsHandler,
    updateLoanStatusHandler,
};
