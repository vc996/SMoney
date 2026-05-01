const { databases, Query } = require("../config/appwrite.config");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "loan_tiers";

// Dữ liệu mặc định khi collection chưa có tier nào
const SEED_TIERS = [
    { id: null, label: "Vay 1–10 triệu",     minAmount: 1_000_000,   maxAmount: 10_000_000,  rates: { 3: 18, 6: 15, 12: 12 }, order: 1 },
    { id: null, label: "Vay 10–50 triệu",    minAmount: 10_000_001,  maxAmount: 50_000_000,  rates: { 3: 15, 6: 12, 12: 10 }, order: 2 },
    { id: null, label: "Vay 50–200 triệu",   minAmount: 50_000_001,  maxAmount: 200_000_000, rates: { 3: 12, 6: 10, 12:  8 }, order: 3 },
    { id: null, label: "Vay trên 200 triệu", minAmount: 200_000_001, maxAmount: 0,           rates: { 3: 10, 6:  8, 12:  6 }, order: 4 },
];

class TierService {
    /** Lấy tất cả tiers từ DB, sắp theo order. Trả về SEED nếu collection trống hoặc chưa tạo. */
    async getAll() {
        try {
            const res = await databases.listDocuments(DB(), COL, [
                Query.orderAsc("order"),
                Query.limit(50),
            ]);
            return res.total > 0 ? res.documents.map(d => this._parse(d)) : SEED_TIERS;
        } catch {
            return SEED_TIERS;
        }
    }

    /**
     * Tìm lãi suất phù hợp với số tiền + kỳ hạn.
     * @param {Array} tiers  — kết quả từ getAll()
     * @param {number} amount
     * @param {number} termMonths
     * @returns {number|null}
     */
    rateFor(tiers, amount, termMonths) {
        const tier = tiers.find(t =>
            amount >= t.minAmount && (t.maxAmount === 0 || amount <= t.maxAmount)
        );
        if (!tier?.rates) return null;
        const key = String(termMonths);
        return tier.rates[key] ?? tier.rates[termMonths] ?? null;
    }

    _parse(doc) {
        return {
            id:        doc.$id,
            label:     doc.label,
            minAmount: doc.minAmount,
            maxAmount: doc.maxAmount,
            rates:     this._tryParse(doc.rates, {}),
            order:     doc.order,
        };
    }

    _tryParse(str, fallback) {
        if (!str) return fallback;
        if (typeof str !== "string") return str;
        try { return JSON.parse(str); } catch { return fallback; }
    }
}

module.exports = { TierService };
