const { databases, DB_ID, COLLECTION_USERS } = require("../config/appwrite.config");

class UserService {

    async getById(userId) {
        return await databases.getDocument(DB_ID, COLLECTION_USERS, userId);
    }

    async ensureProfileExists(userId) {
        try {
            return await this.getById(userId);
        } catch (error) {
            databases.log("=> [4] Phát hiện lỗi 404! Đang chuẩn bị tạo ví mới đây...");
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