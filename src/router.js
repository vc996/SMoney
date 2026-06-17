const { authMiddleware } = require("./middleware/auth.middleware");

const AUTH_ACTIONS = new Set([
    "get_profile",
    "create_task",
    "take_task",
]);

const ADMIN_ACTIONS = new Set([
    "create_task",
    "verify_payout",
]);

async function router(context) {

    const { payload, res } = context;

    const action = payload.action;

    if (!action) {
        return res.json({
            success: false,
            message: "Thiếu action"
        }, 400);
    }

    // Xác thực
    if (AUTH_ACTIONS.has(action) || ADMIN_ACTIONS.has(action)) {

        const auth = await authMiddleware(context);

        if (auth) {
            return auth;
        }

    }

    // Kiểm tra quyền Admin bằng Labels
    if (ADMIN_ACTIONS.has(action)) {

        const labels = context.payload.user.labels || [];

        if (!labels.includes("admin")) {

            return res.json({
                success: false,
                message: "Bạn không có quyền thực hiện chức năng này."
            }, 403);

        }

    }

    switch (action) {

        case "create_task":
            return require("./handlers/task")
                .createTaskHandler(context);

        case "take_task":
            return require("./handlers/task")
                .takeTaskHandler(context);

        default:
            return res.json({
                success: false,
                message: "Action không tồn tại"
            }, 404);

    }

}

module.exports = router;