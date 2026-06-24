const { databases, DB_ID, ID } = require("../config/appwrite.config");
const { Query } = require("node-appwrite");

const COLLECTION_ORDERS = process.env.APPWRITE_COLLECTION_ORDERS;
const COLLECTION_TASKS = process.env.APPWRITE_COLLECTION_TASKS;

class OrderService {
    async createOrder(data) {
        return await databases.createDocument(DB_ID, COLLECTION_ORDERS, ID.unique(), data);
    }

    async findActiveOrder(userId, taskId) {
        const response = await databases.listDocuments(DB_ID, COLLECTION_ORDERS, [
            Query.equal("userId", userId),
            Query.equal("taskId", taskId),
            Query.equal("status", "in_progress")
        ]);
        return response.documents[0] || null;
    }
}

module.exports = { OrderService };