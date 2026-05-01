const { TierService } = require("../service/tier.service");

const tierSvc = new TierService();

// GET action: get_tiers — trả về bảng lãi suất để hiển thị trên app
async function getTiersHandler({ res, error }) {
    try {
        const tiers = await tierSvc.getAll();
        return res.json({ success: true, tiers });
    } catch (err) {
        error("getTiers: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

module.exports = { getTiersHandler };
