const { authMiddleware } = require("./middleware/auth.middleware");

const AUTH_ACTIONS = new Set([
    "get_profile",
    "create_task",
    "get_tasks",
    "receive_order",
]);

const ADMIN_ACTIONS = new Set([
    "create_task",
]);

async function router(context) {
    const { payload, res, log } = context;
    const action = payload.action;

    if (!action) {
        return res.json({ success: false, message: "Thiếu action" }, 400);
    }

    if (AUTH_ACTIONS.has(action) || ADMIN_ACTIONS.has(action)) {
        const authErrorResponse = await authMiddleware(context);

        if (authErrorResponse) {
            return authErrorResponse;
        }
    }

    if (ADMIN_ACTIONS.has(action)) {
        // ✅ Đọc trực tiếp từ context.dbUser đã được gán ở middleware bên trên
        const dbUser = context.dbUser;

        if (process.env.NODE_ENV !== 'production') {
            log(`[Router Check Quyền Admin] Dữ liệu User nhận được: ${JSON.stringify(dbUser)}`);
        }

        // authUser trả về từ account.get() có sẵn mảng labels
        const labels = dbUser?.labels ?? [];

        if (!labels.includes("admin")) {
            return res.json({
                success: false,
                message: "Bạn không có quyền thực hiện chức năng này."
            }, 403);
        }
    }

    switch (action) {
        case "get_profile":
            return require("./handlers/getProfile").authHandler(context);

        case "create_task":
            return require("./handlers/task").createTaskHandler(context);

        case "get_tasks":
            return require("./handlers/task").getTasksHandler(context);
        default:
            return res.json({ success: false, message: "Action không tồn tại" }, 404);
    }
}

module.exports = router;