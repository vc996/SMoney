import router from "./router";

export default async (context) => {
    const { log, error, req, res } = context;

    const missing = ["APPWRITE_DATABASE_ID", "APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "JWT_SECRET"].filter(k => !process.env[k]);
    if (missing.length) {
        error(`Missing env: ${missing.join(", ")}`);
        return res.json({ success: false, message: "Server configuration error" }, 500);
    }

    let payload = req.body;
    try {
        if (typeof payload === "string" && payload.trim() !== "") payload = JSON.parse(payload);
        if (payload?.body) payload = typeof payload.body === "string" ? JSON.parse(payload.body) : payload.body;
        if (payload?.data) payload = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;

        const action = payload?.action || "auth";
        context.payload = payload;

        const result = await router(context);

        const resolvedUser = context.payload?.userId || "anon";
        log(`Action: ${action} | User: ${resolvedUser}`);

        return result;

    } catch (e) {
        error("Parse error: " + e.message);
        return res.json({ success: false, message: "Invalid payload format" }, 400);
    }
};