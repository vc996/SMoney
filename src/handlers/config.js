const { ConfigService } = require("../service/config.service");

const configSvc = new ConfigService();

// GET action: get_config  (public — no auth required)
async function getConfigHandler({ res, error }) {
    try {
        const config = await configSvc.get();
        return res.json({ success: true, config });
    } catch (err) {
        error("getConfig: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

// POST action: update_config  (admin key protected)
async function updateConfigHandler({ payload, res, log, error }) {
    const { adminKey, minAmount, maxAmount, quickAmounts, terms, groupLink } = payload;

    if (adminKey !== process.env.ADMIN_KEY)
        return res.json({ success: false, message: "Không có quyền admin" }, 403);

    // Basic sanity checks
    if (minAmount !== undefined && maxAmount !== undefined && Number(minAmount) >= Number(maxAmount))
        return res.json({ success: false, message: "minAmount phải nhỏ hơn maxAmount" }, 400);

    if (quickAmounts !== undefined && !Array.isArray(quickAmounts))
        return res.json({ success: false, message: "quickAmounts phải là mảng số" }, 400);

    if (terms !== undefined && !Array.isArray(terms))
        return res.json({ success: false, message: "terms phải là mảng object" }, 400);

    try {
        await configSvc.update({ minAmount, maxAmount, quickAmounts, terms, groupLink });
        const config = await configSvc.get();
        log("Config updated by admin");
        return res.json({ success: true, message: "Cập nhật cấu hình thành công", config });
    } catch (err) {
        error("updateConfig: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

module.exports = { getConfigHandler, updateConfigHandler };
