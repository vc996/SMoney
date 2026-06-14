require('dotenv').config(); // <-- Dòng này cực kỳ quan trọng
const { Client, Databases, ID, Query } = require("node-appwrite");

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

module.exports = { databases, ID, Query };
