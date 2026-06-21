const { authMiddleware } = require("./middleware/auth.middleware");

const AUTH_ACTIONS = new Set([
    "get_profile",
    "create_task",
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
        const dbUser = context.payload.dbUser;

        if (process.env.NODE_ENV !== 'production') {
            log(`[Router Check Quyền Admin] Dữ liệu User nhận được: ${JSON.stringify(dbUser)}`);
        }

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

        default:
            return res.json({ success: false, message: "Action không tồn tại" }, 404);
    }
}

module.exports = router;