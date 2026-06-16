const { Client, Databases, ID } = require("node-appwrite");

class UserService {
    constructor() {
        const client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_PROJECT_ID)
            .setKey(process.env.APPWRITE_API_KEY);

        this.db = new Databases(client);
        this.DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
        this.COLLECTION_ID = "users";
    }

    async getOrCreate(userId, name = "") {
        try {
            // 1. Tìm thẳng document bằng getDocument thông qua userId (Nhanh, không cần Query)
            const userDoc = await this.db.getDocument(
                this.DATABASE_ID,
                this.COLLECTION_ID,
                userId // Lấy luôn userId làm Document ID để tìm kiếm
            );
            return userDoc;
        } catch (error) {
            // 2. Nếu không tìm thấy (Mã lỗi 404), tiến hành tạo mới
            if (error.code === 404) {
                return await this.db.createDocument(
                    this.DATABASE_ID,
                    this.COLLECTION_ID,
                    userId, // Đút thẳng userId vào vị trí Document ID (Tham số thứ 3)
                    {
                        // Object dữ liệu (Tham số thứ 4) bao sạch, KHÔNG chứa trường userId trái phép
                        name: name || "",
                        role: "member",
                        balance: 0,
                    }
                );
            }
            // Nếu là lỗi khác thì ném ra ngoài
            throw error;
        }
    }
}

module.exports = { UserService };