const { JwtService } = require("../security/jwt.service");
// 💡 Import các cấu hình dùng chung từ file config cũ
const { databases, DB_ID, COLLECTION_USERS } = require("../config/appwrite");

async function authMiddleware(context) {
    const { payload, req, res, log, error } = context;
    const { JWT_SECRET } = process.env;

    if (!JWT_SECRET) {
        return res.json({ success: false, message: "Server config error" }, 500);
    }

    // 1. Bóc tách lấy Token từ Payload hoặc Headers
    let token = payload.token;
    if (!token && req.headers.authorization) {
        token = req.headers.authorization.replace(/^Bearer\s+/, '');
    }

    if (!token) {
        return res.json({ success: false, message: "Thiếu token xác thực" }, 401);
    }

    try {
        // 2. Giải mã và kiểm tra tính hợp lệ của Token JWT
        const jwt = new JwtService(JWT_SECRET);
        const decoded = jwt.verify(token);

        if (!decoded || !decoded.userId) {
            log("Token không hợp lệ hoặc hết hạn");
            return res.json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn" }, 401);
        }

        const stringUserId = String(decoded.userId);

        // 3. 🚀 LỘI VÀO DATABASE ĐỂ KIỂM TRA QUYỀN (ROLE) VÀ TRẠNG THÁI (STATUS) THỰC TẾ
        const userDoc = await databases.getDocument(DB_ID, COLLECTION_USERS, stringUserId);

        // Chặn ngay lập tức nếu tài khoản này bị Admin khóa (banned) trên hệ thống
        if (userDoc.status === "banned") {
            log(`User bị chặn truy cập vì dính cấm (Banned) | ID: ${stringUserId}`);
            return res.json({ success: false, message: "Tài khoản của bạn đã bị khóa khỏi hệ thống!" }, 403);
        }

        // 4. INJECT DỮ LIỆU ĐÃ ĐỐI SOÁT VÀO CONTEXT ĐỂ ROUTER VÀ HANDLER DÙNG CHUNG
        context.userId = stringUserId;
        context.payload.userId = stringUserId;
        context.payload.role = userDoc.role;     // Gán "admin" hoặc "member" vào đây để Router check quyền
        context.payload.status = userDoc.status; // Tiện lưu luôn trạng thái tài khoản sạch

        return null; // Không có lỗi, cho phép đi tiếp qua cửa Router

    } catch (err) {
        // Bắt trường hợp ID người dùng không tồn tại trong bảng users của Appwrite
        if (err.code === 404) {
            error(`Auth Error: Không tìm thấy Document User ID tương ứng trong bảng.`);
            return res.json({ success: false, message: "Tài khoản chưa được khởi tạo cấu trúc dữ liệu" }, 404);
        }

        error("Auth middleware error: " + err.message);
        return res.json({ success: false, message: "Lỗi xác thực hệ thống bảo mật" }, 401);
    }
}

module.exports = { authMiddleware };