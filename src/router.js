const { authHandler } = require("./handlers/auth");
const { authMiddleware } = require("./middleware/auth.middleware");

const PROTECTED = new Set([
    "get_dashboard",
]);

async function router(context) {
    const { payload, res } = context;
    const action = payload?.action || "auth";

    if (PROTECTED.has(action)) {
        const authError = await authMiddleware(context);
        if (authError) return authError;
    }

    switch (action) {
        case "auth": return authHandler(context);

        default:
            return res.json({ success: false, message: `Action '${action}' không tồn tại` }, 404);
    }
}

module.exports = router;