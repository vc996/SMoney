const { authMiddleware } = require("./middleware/auth.middleware");

// ── Nhóm 1: CTV và Admin đều làm được ──
const USER_ACTIONS = new Set([
    "get_dashboard",
    "take_task",
    "submit_proof"
]);

// ── Nhóm 2: TỐI CAO - Chỉ có Admin mới được làm ──
const ADMIN_ACTIONS = new Set([
    "create_task",
    "verify_payout",
    "get_admin_inventory"
]);

async function router(context) {
    const { payload, res } = context;
    const action = payload?.action || "auth";

    // Kiểm tra nếu hành động yêu cầu quyền bảo mật
    if (USER_ACTIONS.has(action) || ADMIN_ACTIONS.has(action)) {

        // 1. Chạy Middleware để xác thực Token + lấy thông tin User
        const authError = await authMiddleware(context);
        if (authError) return authError; // Trả về lỗi 401 nếu Token sai/hết hạn

        // 2. Nếu là hành động của Admin, kiểm tra thêm quyền (Role)
        if (ADMIN_ACTIONS.has(action)) {
            const userRole = context.payload?.role; // Quyền này được Middleware inject vào sau khi check DB

            if (userRole !== "admin") {
                return res.json({
                    success: false,
                    message: "Từ chối truy cập: Bạn không có quyền quản trị viên!"
                }, 403); // Lỗi 403 Forbidden - Cấm cửa
            }
        }
    }

    // Hệ thống rẽ nhánh xử lý (Dispatch)
    switch (action) {
        case "auth":
            return require("./handlers/auth").authHandler(context);
        case "create_task":
            return require("./handlers/task").createTaskHandler(context);
        default:
            return res.json({ success: false, message: `Action '${action}' không tồn tại` }, 404);
    }
}

module.exports = router;