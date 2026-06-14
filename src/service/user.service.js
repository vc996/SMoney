const { Client, Databases, Query, ID } = require("node-appwrite");

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
        const result = await this.db.listDocuments(
            this.DATABASE_ID,
            this.COLLECTION_ID,
            [Query.equal("userId", userId)]
        );

        if (result.documents.length > 0) {
            return result.documents[0];
        }

        return await this.db.createDocument(
            this.DATABASE_ID,
            this.COLLECTION_ID,
            ID.unique(),
            {
                userId,
                name,
                role: "member",
                balance: 0,
            }
        );
    }
}

module.exports = { UserService };