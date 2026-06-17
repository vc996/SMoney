const { authMiddleware } = require("./middleware/auth.middleware");

const USER_ACTIONS = new Set([
    "get_profile",
]);

const ADMIN_ACTIONS = new Set([
    "create_task",
]);

async function router(context) {

    const { payload, res } = context;

    const action = payload.action || "";

    if (
        USER_ACTIONS.has(action) ||
        ADMIN_ACTIONS.has(action)
    ) {

        const auth = await authMiddleware(context);

        if (auth) return auth;

    }

    switch (action) {

        case "get_profile":

            return require("./handlers/user")
                .getProfileHandler(context);

        case "create_task":

            return require("./handlers/task")
                .createTaskHandler(context);

        default:

            return res.json({

                success: false,

                message: "Action không tồn tại",

            }, 404);

    }

}

module.exports = router;