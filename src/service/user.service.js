const { databases } = require("../config/appwrite.config");

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL = "users";

class UserService {
    async getOrCreate(telegramId) {
        const id = String(telegramId);
        try {
            return await databases.getDocument(DB(), COL, id);
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") {
                return await databases.createDocument(DB(), COL, id, {
                    kycStatus: "none",
                    creditScore: 500,
                    totalBorrowed: 0,
                    totalRepaid: 0,
                    activeLoansCount: 0,
                });
            }
            throw err;
        }
    }

    async updateKycStatus(telegramId, status) {
        return await databases.updateDocument(DB(), COL, String(telegramId), { kycStatus: status });
    }

    async updateCreditScore(telegramId, delta) {
        const user = await this.getOrCreate(telegramId);
        const newScore = Math.min(1000, Math.max(0, user.creditScore + delta));
        return await databases.updateDocument(DB(), COL, String(telegramId), { creditScore: newScore });
    }

    async incrementStats(telegramId, { borrowed = 0, repaid = 0, activeLoans = 0 }) {
        const user = await this.getOrCreate(telegramId);
        return await databases.updateDocument(DB(), COL, String(telegramId), {
            totalBorrowed: user.totalBorrowed + borrowed,
            totalRepaid: user.totalRepaid + repaid,
            activeLoansCount: user.activeLoansCount + activeLoans,
        });
    }
}

module.exports = { UserService };
