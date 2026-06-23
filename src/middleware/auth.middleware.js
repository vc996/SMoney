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
        // Lấy thông tin tài khoản từ Appwrite Auth thông qua JWT
        const authUser = await account.get();

        // 🎯 FIX Ở ĐÂY: Gắn thẳng dbUser và userId vào `context` để router.js lấy ra dùng chung dễ dàng
        context.dbUser = authUser;
        context.userId = authUser.$id;

        context.log("=> [1] Middleware check JWT ngon lành rồi!");
        return null; // Xác thực thành công, cho đi tiếp
    } catch (err) {
        if (typeof error === 'function') error(`[Middleware Auth Error]: ${err.message}`);
        return res.json({ success: false, message: "Phiên đăng nhập không hợp lệ." }, 401);
    }
}

module.exports = { authMiddleware };