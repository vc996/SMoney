const { databases, ID, Query } = require("../config/appwrite.config");
const { calcMonthlyPayment, calcTotalRepayable, calcDueDate, calcNextPaymentDate } = require("../utils/interest");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "loans";

class LoanService {
    /** Tạo đơn vay mới — bắt đầu ở trạng thái PENDING, chờ admin duyệt */
    async create({ borrowerId, amount, currency, termMonths, interestRate, note }) {
        const annualRate     = interestRate ?? 15;
        const monthlyPayment = calcMonthlyPayment(amount, annualRate, termMonths);
        const totalRepayable = calcTotalRepayable(monthlyPayment, termMonths);

        // Dùng placeholder date để thoả schema Appwrite (required field)
        // Hai trường này sẽ được tính lại chính xác từ thời điểm admin duyệt
        const now = new Date().toISOString();
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
            note:             note || null,
            dueDate:          calcDueDate(now, termMonths),
            nextPaymentDate:  calcNextPaymentDate(now, 0),
        });
    }

    /** Admin duyệt → ACTIVE, ghi ngày bắt đầu từ thời điểm duyệt */
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

        const updates = { status: "REJECTED" };
        if (reason) updates.rejectionReason = reason;
        return await databases.updateDocument(DB(), COL, loanId, updates);
    }

    async repay(loanId, amount) {
        const loan = await this.getById(loanId);
        const newPaid         = loan.paidAmount + amount;
        const newInstallments = loan.installmentsPaid + 1;
        const isCompleted     = newInstallments >= loan.termMonths;

        const updates = {
            paidAmount:       newPaid,
            installmentsPaid: newInstallments,
            status:           isCompleted ? "COMPLETED" : "ACTIVE",
        };
        if (!isCompleted) {
            updates.nextPaymentDate = calcNextPaymentDate(loan.$createdAt, newInstallments);
        }

        return await databases.updateDocument(DB(), COL, loanId, updates);
    }

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
            note:             loan.note,
            dueDate:          loan.dueDate,
            nextPaymentDate:  loan.nextPaymentDate,
            createdAt:        loan.$createdAt,
        };
    }
}

module.exports = { LoanService };
