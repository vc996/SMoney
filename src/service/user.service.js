const { databases, ID, Query } = require("../config/appwrite.config");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "users";

class UserService {
    /** Tìm user theo userId (field), tạo mới nếu chưa tồn tại */
    async getOrCreate(telegramId) {
        const uid = String(telegramId);

        const res = await databases.listDocuments(DB(), COL, [
            Query.equal("userId", uid),
            Query.limit(1),
        ]);

        if (res.total > 0) return res.documents[0];

        return await databases.createDocument(DB(), COL, ID.unique(), {
            userId:           uid,
            creditScore:      500,
            totalBorrowed:    0,
            totalRepaid:      0,
            activeLoansCount: 0,
        });
    }

    /** Cộng/trừ điểm tín dụng, giữ trong [0, 1000] */
    async updateCreditScore(telegramId, delta) {
        const user     = await this.getOrCreate(telegramId);
        const newScore = Math.min(1000, Math.max(0, user.creditScore + delta));
        return await databases.updateDocument(DB(), COL, user.$id, { creditScore: newScore });
    }

    /**
     * Tăng/giảm các thống kê tổng hợp.
     * @param {{ borrowed?, repaid?, activeLoans? }} deltas
     */
    async incrementStats(telegramId, { borrowed = 0, repaid = 0, activeLoans = 0 }) {
        const user = await this.getOrCreate(telegramId);
        return await databases.updateDocument(DB(), COL, user.$id, {
            totalBorrowed:    Math.max(0, user.totalBorrowed    + borrowed),
            totalRepaid:      Math.max(0, user.totalRepaid      + repaid),
            activeLoansCount: Math.max(0, user.activeLoansCount + activeLoans),
        });
    }
}

module.exports = { UserService };
