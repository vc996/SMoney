const { databases, ID, Query } = require("../config/appwrite.config");
const { calcMonthlyPayment, calcTotalRepayable, calcDueDate, calcNextPaymentDate } = require("../utils/interest");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "loans";

class LoanService {
    /**
     * Tạo đơn vay mới — trạng thái PENDING, chờ admin duyệt.
     * dueDate & nextPaymentDate để null, được set khi approve.
     */
    async create({ borrowerId, amount, currency, termMonths, interestRate }) {
        const annualRate     = interestRate ?? 15;
        const monthlyPayment = calcMonthlyPayment(amount, annualRate, termMonths);
        const totalRepayable = calcTotalRepayable(monthlyPayment, termMonths);

        return await databases.createDocument(DB(), COL, ID.unique(), {
            borrowerId:       String(borrowerId),
            amount,
            currency:         currency || "VND",
            interestRate:     annualRate,
            termMonths,
            monthlyPayment,
            totalRepayable,
            paidAmount:       0,
            installmentsPaid: 0,
            status:           "PENDING",
            dueDate:          null,   // nullable — set khi admin duyệt
            nextPaymentDate:  null,   // nullable — set khi admin duyệt
            rejectionReason:  null,
        });
    }

    /** Admin duyệt → ACTIVE. Tính ngày bắt đầu từ thời điểm duyệt. */
    async approve(loanId) {
        const loan = await this.getById(loanId);
        if (loan.status !== "PENDING")
            throw new Error("Khoản vay không ở trạng thái chờ duyệt");

        const now = new Date().toISOString();
        return await databases.updateDocument(DB(), COL, loanId, {
            status:          "ACTIVE",
            dueDate:         calcDueDate(now, loan.termMonths),
            nextPaymentDate: calcNextPaymentDate(now, 0),
        });
    }

    /** Admin từ chối → REJECTED */
    async reject(loanId, reason) {
        const loan = await this.getById(loanId);
        if (loan.status !== "PENDING")
            throw new Error("Khoản vay không ở trạng thái chờ duyệt");

        return await databases.updateDocument(DB(), COL, loanId, {
            status:          "REJECTED",
            rejectionReason: reason || null,
        });
    }

    /**
     * Ghi nhận thanh toán một kỳ.
     * @param {string} loanId
     * @param {number} amount - Tổng tiền trả (gốc + phạt nếu có)
     */
    async repay(loanId, amount) {
        const loan            = await this.getById(loanId);
        const newPaid         = loan.paidAmount + amount;
        const newInstallments = loan.installmentsPaid + 1;
        const isCompleted     = newInstallments >= loan.termMonths;

        return await databases.updateDocument(DB(), COL, loanId, {
            paidAmount:       newPaid,
            installmentsPaid: newInstallments,
            status:           isCompleted ? "COMPLETED" : "ACTIVE",
            nextPaymentDate:  isCompleted
                ? null
                : calcNextPaymentDate(loan.$createdAt, newInstallments),
        });
    }

    /** Cập nhật trạng thái thủ công (admin) */
    async updateStatus(loanId, status) {
        return await databases.updateDocument(DB(), COL, loanId, { status });
    }

    async getById(loanId) {
        return await databases.getDocument(DB(), COL, loanId);
    }

    async getByBorrower(borrowerId, { status, limit = 20, offset = 0 } = {}) {
        const q = [
            Query.equal("borrowerId", String(borrowerId)),
            Query.orderDesc("$createdAt"),
            Query.limit(limit),
            Query.offset(offset),
        ];
        if (status) q.push(Query.equal("status", status));
        return await databases.listDocuments(DB(), COL, q);
    }

    format(loan) {
        const remaining = (loan.totalRepayable ?? 0) - (loan.paidAmount ?? 0);
        const progress  = loan.totalRepayable
            ? parseFloat(((loan.paidAmount / loan.totalRepayable) * 100).toFixed(1))
            : 0;

        return {
            id:               loan.$id,
            borrowerId:       loan.borrowerId,
            amount:           loan.amount,
            currency:         loan.currency,
            interestRate:     loan.interestRate,
            termMonths:       loan.termMonths,
            monthlyPayment:   loan.monthlyPayment,
            totalRepayable:   loan.totalRepayable,
            paidAmount:       loan.paidAmount,
            remainingAmount:  remaining,
            installmentsPaid: loan.installmentsPaid,
            installmentsLeft: loan.termMonths - loan.installmentsPaid,
            progressPercent:  progress,
            status:           loan.status,
            rejectionReason:  loan.rejectionReason ?? null,
            note:             loan.note ?? null,
            dueDate:          loan.dueDate ?? null,
            nextPaymentDate:  loan.nextPaymentDate ?? null,
            createdAt:        loan.$createdAt,
        };
    }
}

module.exports = { LoanService };
