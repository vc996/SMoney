const {
    databases,
    DB_ID,
    COLLECTION_TASKS,
    ID,
} = require("../config/appwrite.config");

class TaskService {

    async create(data) {

        return await databases.createDocument(
            DB_ID,
            COLLECTION_TASKS,
            ID.unique(),
            data
        );

    }

}

module.exports = {
    TaskService,
};