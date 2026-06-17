const { Client, Account } = require("node-appwrite");

const { UserService } = require("../service/user.service");

const userSvc = new UserService();

async function authMiddleware(context) {

    const { req, payload, res } = context;

    const token =
        req.headers?.authorization?.replace(/^Bearer\s+/i, "") ||
        payload?.jwt;

    if (!token) {
        return res.json({
            success: false,
            message: "Thiếu JWT",
        }, 401);
    }

    try {

        const client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_PROJECT_ID)
            .setJWT(token);

        const account = new Account(client);

        const appUser = await account.get();

        const userDoc = await userSvc.getById(appUser.$id);

        if (userDoc.status === "banned") {

            return res.json({
                success: false,
                message: "Tài khoản đã bị khóa",
            }, 403);

        }

        context.payload.userId = appUser.$id;
        context.payload.role = userDoc.role;
        context.payload.status = userDoc.status;

        return null;

    } catch {

        return res.json({
            success: false,
            message: "JWT không hợp lệ",
        }, 401);

    }

}

module.exports = {
    authMiddleware,
};