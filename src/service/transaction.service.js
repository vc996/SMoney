const { databases, ID, Query } = require("../config/appwrite.config");

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL = "transactions";

const TX_TYPES = {
    DISBURSEMENT: "DISBURSEMENT", // Giải ngân
    REPAYMENT:    "REPAYMENT",    // Trả nợ
    PENALTY:      "PENALTY",      // Phí phạt
};

const TX_LABELS = {
    DISBURSEMENT: "Giải ngân",
    REPAYMENT:    "Trả nợ",
    PENALTY:      "Phí phạt",
};

class TransactionService {
    async record({ loanId, userId, type, amount, note = null }) {
        return await databases.createDocument(DB(), COL, ID.unique(), {
            loanId: String(loanId),
            userId: String(userId),
            type,
            amount,
            note,
            createdAt: new Date().toISOString(),
        });
    }

    async getByLoan(loanId, { limit = 50, offset = 0 } = {}) {
        return await databases.listDocuments(DB(), COL, [
            Query.equal("loanId", String(loanId)),
            Query.orderDesc("createdAt"),
            Query.limit(limit),
            Query.offset(offset),
        ]);
    }

    async getByUser(userId, { limit = 50, offset = 0 } = {}) {
        return await databases.listDocuments(DB(), COL, [
            Query.equal("userId", String(userId)),
            Query.orderDesc("createdAt"),
            Query.limit(limit),
            Query.offset(offset),
        ]);
    }

    format(tx) {
        return {
            id: tx.$id,
            loanId: tx.loanId,
            userId: tx.userId,
            type: tx.type,
            label: TX_LABELS[tx.type] || tx.type,
            amount: tx.amount,
            note: tx.note,
            createdAt: tx.createdAt,
        };
    }
}

module.exports = { TransactionService, TX_TYPES };
