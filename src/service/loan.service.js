const { databases, ID, Query } = require("../config/appwrite.config");
const { calcMonthlyPayment, calcTotalRepayable, calcDueDate, calcNextPaymentDate } = require("../utils/interest");

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL = "loans";

const RATE_BY_TERM = { 3: 18, 6: 15, 12: 12 };

class LoanService {
    async create({ borrowerId, amount, currency, termMonths, note }) {
        const annualRate = RATE_BY_TERM[termMonths] ?? 15;
        const monthlyPayment = calcMonthlyPayment(amount, annualRate, termMonths);
        const totalRepayable = calcTotalRepayable(monthlyPayment, termMonths);
        const now = new Date().toISOString();

        return await databases.createDocument(DB(), COL, ID.unique(), {
            borrowerId: String(borrowerId),
            amount,
            currency: currency || "VND",
            interestRate: annualRate,
            termMonths,
            monthlyPayment,
            totalRepayable,
            paidAmount: 0,
            installmentsPaid: 0,
            status: "ACTIVE",
            note: note || null,
            dueDate: calcDueDate(now, termMonths),
            nextPaymentDate: calcNextPaymentDate(now, 0),
        });
    }

    async repay(loanId, amount) {
        const loan = await this.getById(loanId);
        const newPaid = loan.paidAmount + amount;
        const newInstallments = loan.installmentsPaid + 1;
        const isCompleted = newInstallments >= loan.termMonths;

        const updates = {
            paidAmount: newPaid,
            installmentsPaid: newInstallments,
            status: isCompleted ? "COMPLETED" : "ACTIVE",
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
        const remaining = loan.totalRepayable - loan.paidAmount;
        const progress = loan.totalRepayable
            ? parseFloat(((loan.paidAmount / loan.totalRepayable) * 100).toFixed(1))
            : 0;

        return {
            id: loan.$id,
            borrowerId: loan.borrowerId,
            amount: loan.amount,
            currency: loan.currency,
            interestRate: loan.interestRate,
            termMonths: loan.termMonths,
            monthlyPayment: loan.monthlyPayment,
            totalRepayable: loan.totalRepayable,
            paidAmount: loan.paidAmount,
            remainingAmount: remaining,
            installmentsPaid: loan.installmentsPaid,
            installmentsLeft: loan.termMonths - loan.installmentsPaid,
            progressPercent: progress,
            status: loan.status,
            note: loan.note,
            dueDate: loan.dueDate,
            nextPaymentDate: loan.nextPaymentDate,
            createdAt: loan.$createdAt,
        };
    }
}

module.exports = { LoanService };
