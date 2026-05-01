const { databases } = require("../config/appwrite.config");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "users";

const DEFAULTS = {
    kycStatus:        "pending",
    creditScore:      500,
    totalBorrowed:    0,
    totalRepaid:      0,
    activeLoansCount: 0,
};

class UserService {
    /** Lấy user, tạo mới nếu chưa tồn tại */
    async getOrCreate(telegramId) {
        const id = String(telegramId);
        try {
            return await databases.getDocument(DB(), COL, id);
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") {
                return await databases.createDocument(DB(), COL, id, DEFAULTS);
            }
            throw err;
        }
    }

    /** Cập nhật trạng thái KYC */
    async updateKycStatus(telegramId, status) {
        return await databases.updateDocument(DB(), COL, String(telegramId), { kycStatus: status });
    }

    /** Cộng/trừ điểm tín dụng, giữ trong [0, 1000] */
    async updateCreditScore(telegramId, delta) {
        const user     = await this.getOrCreate(telegramId);
        const newScore = Math.min(1000, Math.max(0, user.creditScore + delta));
        return await databases.updateDocument(DB(), COL, String(telegramId), { creditScore: newScore });
    }

    /**
     * Tăng/giảm các thống kê tổng hợp.
     * @param {{ borrowed?, repaid?, activeLoans? }} deltas
     */
    async incrementStats(telegramId, { borrowed = 0, repaid = 0, activeLoans = 0 }) {
        const user = await this.getOrCreate(telegramId);
        return await databases.updateDocument(DB(), COL, String(telegramId), {
            totalBorrowed:    Math.max(0, user.totalBorrowed    + borrowed),
            totalRepaid:      Math.max(0, user.totalRepaid      + repaid),
            activeLoansCount: Math.max(0, user.activeLoansCount + activeLoans),
        });
    }
}

module.exports = { UserService };
