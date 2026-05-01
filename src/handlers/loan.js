const { LoanService } = require("../service/loan.service");
const { TransactionService, TX_TYPES } = require("../service/transaction.service");
const { UserService } = require("../service/user.service");
const { validateCreateLoan, validateRepay } = require("../utils/validators");
const { calcLateFee } = require("../utils/interest");

const loanSvc = new LoanService();
const txSvc = new TransactionService();
const userSvc = new UserService();

// POST action: create_loan
async function createLoanHandler({ payload, res, log, error }) {
    const { userId, amount, currency = "VND", termMonths, note } = payload;

    const errors = validateCreateLoan({ amount, currency, termMonths });
    if (errors.length) return res.json({ success: false, message: errors[0] }, 400);

    try {
        const loan = await loanSvc.create({ borrowerId: userId, amount, currency, termMonths, note });

        await txSvc.record({
            loanId: loan.$id,
            userId,
            type: TX_TYPES.DISBURSEMENT,
            amount,
            note: `Giải ngân khoản vay ${termMonths} tháng`,
        });

        await userSvc.incrementStats(userId, { borrowed: amount, activeLoans: 1 });

        log(`Loan created: ${loan.$id} by ${userId}`);
        return res.json({ success: true, message: "Tạo khoản vay thành công", loan: loanSvc.format(loan) });
    } catch (err) {
        error("createLoan: " + err.message);
        return res.json({ success: false, message: "Không thể tạo khoản vay" }, 500);
    }
}

// POST action: repay
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
        const now = new Date();
        const nextDue = new Date(loan.nextPaymentDate);
        if (now > nextDue) {
            const daysLate = Math.floor((now - nextDue) / 86_400_000);
            lateFee = calcLateFee(loan.monthlyPayment, daysLate);
        }

        const totalPay = amount + lateFee;
        const updatedLoan = await loanSvc.repay(loanId, totalPay);

        await txSvc.record({
            loanId,
            userId,
            type: TX_TYPES.REPAYMENT,
            amount: totalPay,
            note: lateFee > 0
                ? `Kỳ ${updatedLoan.installmentsPaid} + phí phạt ${lateFee.toLocaleString()}`
                : `Kỳ ${updatedLoan.installmentsPaid}`,
        });

        if (lateFee > 0) {
            await txSvc.record({ loanId, userId, type: TX_TYPES.PENALTY, amount: lateFee, note: "Phí phạt chậm thanh toán" });
        }

        await userSvc.incrementStats(userId, { repaid: totalPay });

        if (updatedLoan.status === "COMPLETED") {
            await userSvc.incrementStats(userId, { activeLoans: -1 });
            await userSvc.updateCreditScore(userId, +50);
        }

        log(`Repay loan ${loanId}: ${totalPay}`);
        return res.json({
            success: true,
            message: updatedLoan.status === "COMPLETED" ? "Chúc mừng! Đã trả hết khoản vay!" : `Trả kỳ ${updatedLoan.installmentsPaid} thành công`,
            loan: loanSvc.format(updatedLoan),
            payment: { amount, lateFee, total: totalPay },
        });
    } catch (err) {
        error("repay: " + err.message);
        return res.json({ success: false, message: "Không thể xử lý thanh toán" }, 500);
    }
}

// GET action: get_loan
async function getLoanHandler({ payload, res, error }) {
    const { userId, loanId } = payload;
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

// GET action: get_loans
async function getLoansHandler({ payload, res, error }) {
    const { userId, status, limit = 20, offset = 0 } = payload;
    try {
        const result = await loanSvc.getByBorrower(userId, { status, limit, offset });
        return res.json({
            success: true,
            loans: result.documents.map(l => loanSvc.format(l)),
            total: result.total,
        });
    } catch (err) {
        error("getLoans: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

// GET action: get_transactions
async function getTransactionsHandler({ payload, res, error }) {
    const { userId, loanId, limit = 50, offset = 0 } = payload;
    try {
        const result = loanId
            ? await txSvc.getByLoan(loanId, { limit, offset })
            : await txSvc.getByUser(userId, { limit, offset });

        const transactions = result.documents.map(t => txSvc.format(t));

        const summary = transactions.reduce(
            (acc, tx) => {
                if (tx.type === "DISBURSEMENT") acc.totalIn += tx.amount;
                if (["REPAYMENT", "PENALTY"].includes(tx.type)) acc.totalOut += tx.amount;
                return acc;
            },
            { totalIn: 0, totalOut: 0 }
        );

        return res.json({ success: true, transactions, summary, total: result.total });
    } catch (err) {
        error("getTransactions: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

// POST action: update_loan_status (admin)
async function updateLoanStatusHandler({ payload, res, log, error }) {
    const { adminKey, loanId, status } = payload;
    const VALID = ["ACTIVE", "COMPLETED", "OVERDUE", "CANCELLED"];

    if (adminKey !== process.env.ADMIN_KEY)
        return res.json({ success: false, message: "Không có quyền admin" }, 403);
    if (!VALID.includes(status))
        return res.json({ success: false, message: `Status phải là: ${VALID.join(", ")}` }, 400);

    try {
        await loanSvc.updateStatus(loanId, status);
        log(`Loan ${loanId} status → ${status}`);
        return res.json({ success: true, message: `Cập nhật trạng thái thành ${status}` });
    } catch (err) {
        error("updateLoanStatus: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

module.exports = { createLoanHandler, repayHandler, getLoanHandler, getLoansHandler, getTransactionsHandler, updateLoanStatusHandler };
