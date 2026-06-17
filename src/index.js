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

        error(err.message);

        return res.json({

            success: false,

            message: "Invalid payload",

        }, 400);

    }

};