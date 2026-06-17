const { Client, Databases, ID, Query } = require("node-appwrite");

// Khởi tạo instance kết nối
const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Xuất bản ghi (Export) theo cách cũ tập trung
module.exports = {
    databases,
    ID,
    Query,
    DB_ID: process.env.APPWRITE_DATABASE_ID,
    COLLECTION_USERS: "users",
    COLLECTION_TASKS: "tasks",
    COLLECTION_ORDERS: "orders",
    COLLECTION_INVENTORY: "inventory",
    COLLECTION_TRANSACTIONS: "transactions",
    COLLECTION_WITHDRAWALS: "withdrawals"
};