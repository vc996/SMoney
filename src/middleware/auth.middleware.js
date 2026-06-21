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
        // Gọi Auth để check xem JWT sống hay chết
        const authUser = await account.get();

        // Pass dữ liệu thô sang payload để các hàm sau thích lấy gì thì lấy
        context.payload.userId = authUser.$id;
        context.payload.authUser = authUser;

        return null; // JWT chuẩn, mở cửa cho đi tiếp

    } catch (err) {
        if (typeof error === 'function') error(`[Middleware Auth Error]: ${err.message}`);
        return res.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, 401);
    }
}

module.exports = { authMiddleware };