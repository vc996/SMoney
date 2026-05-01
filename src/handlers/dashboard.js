const { LoanService } = require("../service/loan.service");
const { TransactionService } = require("../service/transaction.service");
const { UserService } = require("../service/user.service");
const { KycService } = require("../service/kyc.service");

const loanSvc = new LoanService();
const txSvc = new TransactionService();
const userSvc = new UserService();
const kycSvc = new KycService();

// GET action: get_dashboard
async function getDashboardHandler({ payload, res, error }) {
    const { userId } = payload;

    try {
        const [user, loansResult, recentTxResult, kyc] = await Promise.all([
            userSvc.getOrCreate(userId),
            loanSvc.getByBorrower(userId, { limit: 10 }),
            txSvc.getByUser(userId, { limit: 5 }),
            kycSvc.getByUser(userId),
        ]);

        const loans = loansResult.documents.map(l => loanSvc.format(l));
        const recentTransactions = recentTxResult.documents.map(t => txSvc.format(t));

        // Ưu tiên: OVERDUE > ACTIVE > PENDING (mới nhất)
        const priority = ["OVERDUE", "ACTIVE", "PENDING"];
        let widgetLoan = null;
        for (const s of priority) {
            widgetLoan = loans.find(l => l.status === s) ?? null;
            if (widgetLoan) break;
        }

        const loanWidget = widgetLoan ? {
            loanId:          widgetLoan.id,
            amount:          widgetLoan.amount,
            currency:        widgetLoan.currency,
            progressPercent: widgetLoan.progressPercent,
            paidAmount:      widgetLoan.paidAmount,
            remainingAmount: widgetLoan.remainingAmount,
            monthlyPayment:  widgetLoan.monthlyPayment,
            nextPaymentDate: widgetLoan.nextPaymentDate,
            installmentsLeft: widgetLoan.installmentsLeft,
            status:          widgetLoan.status,
            rejectionReason: widgetLoan.rejectionReason ?? null,
        } : null;

        return res.json({
            success: true,
            dashboard: {
                user: {
                    userId,
                    kycStatus: user.kycStatus,
                    creditScore: user.creditScore,
                    totalBorrowed: user.totalBorrowed,
                    totalRepaid: user.totalRepaid,
                    activeLoansCount: user.activeLoansCount,
                },
                kyc: kycSvc.format(kyc),
                loanWidget,
                recentTransactions,
                allLoans: loans,
            },
        });
    } catch (err) {
        error("getDashboard: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

module.exports = { getDashboardHandler };
