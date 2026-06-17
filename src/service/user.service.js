const {
    databases,
    DB_ID,
    COLLECTION_USERS,
} = require("../config/appwrite.config");

class UserService {

    async getById(userId) {

        return await databases.getDocument(
            DB_ID,
            COLLECTION_USERS,
            userId
        );

    }

}

module.exports = {
    UserService,
};