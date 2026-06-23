const { databases, DB_ID, COLLECTION_USERS } = require("../config/appwrite.config");

class UserService {

    async getById(userId) {
        return await databases.getDocument(DB_ID, COLLECTION_USERS, userId);
    }

    async ensureProfileExists(userId) {
        try {
            return await this.getById(userId);
        } catch (error) {
            console.log("👉 ĐÃ QUÉT ĐƯỢC LỖI THỰC TẾ:", error);
            console.log("👉 error.code thực tế là:", error.code);
            console.log("👉 error.message thực tế là:", error.message);
            if (error.code === 404 || error.message.includes("not found")) {
                return await databases.createDocument(
                    DB_ID,
                    COLLECTION_USERS,
                    userId,
                    {
                        balance: 0,
                        totalCommission: 0,
                        totalOrders: 0
                    }
                );
            }
            throw error;
        }
    }
}

module.exports = { UserService };