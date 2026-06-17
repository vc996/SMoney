const { authMiddleware } = require("./middleware/auth.middleware");

// Các action yêu cầu đăng nhập
const AUTH_ACTIONS = new Set([
    "get_profile",
    "create_task",
    "take_task",
    "submit_proof",
]);

// Các action chỉ Admin được phép
const ADMIN_ACTIONS = new Set([
    "create_task",
    "verify_payout",
    "get_admin_inventory",
]);

async function router(context) {

    const { payload, res } = context;

    const action = payload?.action;

    if (!action) {
        return res.json({
            success: false,
            message: "Thiếu action"
        }, 400);
    }

    // Xác thực JWT
    if (AUTH_ACTIONS.has(action) || ADMIN_ACTIONS.has(action)) {

        const authResult = await authMiddleware(context);

        if (authResult) {
            return authResult;
        }

    }

    // Kiểm tra quyền Admin
    if (ADMIN_ACTIONS.has(action)) {

        if (context.payload.role !== "admin") {

            return res.json({
                success: false,
                message: "Bạn không có quyền thực hiện chức năng này."
            }, 403);

        }

    }

    switch (action) {

        case "get_profile":
            return require("./handlers/user")
                .getProfileHandler(context);

        case "create_task":
            return require("./handlers/task")
                .createTaskHandler(context);

        case "take_task":
            return require("./handlers/task")
                .takeTaskHandler(context);

        case "submit_proof":
            return require("./handlers/task")
                .submitProofHandler(context);

        default:
            return res.json({
                success: false,
                message: `Action '${action}' không tồn tại`
            }, 404);

    }

}

module.exports = router;