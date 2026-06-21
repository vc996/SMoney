const router = require("./router");

module.exports = async (context) => {
    const { req, res, error } = context;

    try {
        let payload = req.body || {};

        // Tự động parse nếu Appwrite gửi lên dạng chuỗi JSON thô
        if (typeof payload === "string") {
            payload = JSON.parse(payload);
        }

        // Đính kèm vào context để các file sau (Middleware, Router, Handler) xài chung
        context.payload = payload;

        // Kích hoạt router điều hướng action
        return await router(context);

    } catch (err) {
        // Đã sửa: Thêm check type để bảo vệ server không bị crash
        if (typeof error === 'function') {
            error(`[Index Crash Error]: ${err.message}`);
        }

        return res.json({
            success: false,
            message: "Dữ liệu yêu cầu (Payload) không hợp lệ.",
        }, 400);
    }
};