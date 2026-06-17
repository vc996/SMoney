// ── 1. ĐỔI CÚ PHÁP ĐẦU VÀO SANG COMMONJS ──
const router = require("./router");

module.exports = async (context) => {
    const { log, error, req, res } = context;

    // Kiểm tra cấu hình biến môi trường hệ thống
    const missing = ["APPWRITE_DATABASE_ID", "APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "JWT_SECRET"].filter(k => !process.env[k]);
    if (missing.length) {
        error(`Missing env: ${missing.join(", ")}`);
        return res.json({ success: false, message: "Server configuration error" }, 500);
    }

    // Bóc tách và bẻ phẳng Payload nhận được từ Frontend
    let payload = req.body;
    try {
        if (typeof payload === "string" && payload.trim() !== "") payload = JSON.parse(payload);
        if (payload?.body) payload = typeof payload.body === "string" ? JSON.parse(payload.body) : payload.body;
        if (payload?.data) payload = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;

        const action = payload?.action || "auth";

        // Inject payload sạch ngược lại vào context để Router và các Handler dùng chung
        context.payload = payload;

        // Đẩy sang hệ thống Router điều phối hành động
        const result = await router(context);

        // Lấy thông tin User sau khi chạy qua authMiddleware để log hệ thống
        const resolvedUser = context.payload?.userId || "anon";
        log(`Action: ${action} | User: ${resolvedUser}`);

        return result;

    } catch (e) {
        error("Parse error: " + e.message);
        return res.json({ success: false, message: "Invalid payload format" }, 400);
    }
};