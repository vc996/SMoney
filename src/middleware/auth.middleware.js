const { Client, Account } = require("node-appwrite");

async function authMiddleware(context) {

    const { payload, res } = context;

    const jwt = payload.jwt;

    if (!jwt) {
        return res.json({
            success: false,
            message: "Thiếu JWT"
        }, 401);
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setJWT(jwt);

    const account = new Account(client);

    try {

        const user = await account.get();
        context.payload.userId = user.$id;
        context.payload.user = user;

        return null;

    } catch {

        return res.json({
            success: false,
            message: "JWT không hợp lệ"
        }, 401);

    }

}

module.exports = {
    authMiddleware
};