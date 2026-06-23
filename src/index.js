const router = require("./router");

module.exports = async (context) => {
    const { req, res, error } = context;

    try {
        let payload = req.body || {};

        if (typeof payload === "string") {
            payload = JSON.parse(payload);
        }

        context.payload = payload;

        return await router(context);

    } catch (err) {
        if (typeof error === 'function') {
            error(`[Index Crash Error]: ${err.message}`);
        }

        return res.json({
            success: false,
            message: "Dữ liệu yêu cầu (Payload) không hợp lệ.",
        }, 400);
    }
};