const {
    databases,
    DB_ID,
    COLLECTION_TASKS,
    ID,
} = require("../config/appwrite.config");

// 🎯 Nhớ import thêm Query từ node-appwrite để dùng tính năng sắp xếp/limit của Appwrite
const { Query } = require("node-appwrite");

class TaskService {

    async create(data) {
        return await databases.createDocument(
            DB_ID,
            COLLECTION_TASKS,
            ID.unique(),
            data
        );
    }

    // 🎯 THÊM CHÍNH XÁC HÀM NÀY VÀO ĐÂY:
    async list() {
        try {
            // Gọi lệnh listDocuments trực tiếp từ biến databases lấy từ file config của bạn
            const response = await databases.listDocuments(
                DB_ID,
                COLLECTION_TASKS,
                [
                    Query.orderDesc("$createdAt"), // Đưa chiến dịch mới tạo lên đầu danh sách
                    Query.limit(100)               // Lấy tối đa 100 chiến dịch
                ]
            );
            return response; // Trả về object chứa { documents: [...], total: X }
        } catch (error) {
            console.error("Lỗi tại TaskService.list:", error.message);
            throw error;
        }
    }

}

module.exports = {
    TaskService,
};