const { Client, Account } = require("node-appwrite");

async function authMiddleware(context) {
    const { payload, res, error } = context;
    const jwt = payload.jwt;

    if (!jwt) {
        return res.json({ success: false, message: "Thiếu JWT" }, 401);
    }

    const client = new Client()
        .setEndpoint(process.env.APPWRITE_ENDPOINT)
        .setProject(process.env.APPWRITE_PROJECT_ID)
        .setJWT(jwt);

    const account = new Account(client);

    try {
        const authUser = await account.get();

        context.dbUser = authUser;
        context.userId = authUser.$id;

        return null;
    } catch (err) {
        if (typeof error === 'function') error(`[Middleware Auth Error]: ${err.message}`);
        return res.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, 401);
    }
}

module.exports = { authMiddleware };