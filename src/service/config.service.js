const { databases } = require("../config/appwrite.config");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "app_config";
const DOC = "loan_config";

const DEFAULTS = {
    minAmount:    1_000_000,
    maxAmount:  500_000_000,
    quickAmounts: "[5000000,10000000,20000000,50000000]",
    terms: JSON.stringify([
        { months: 3,  rate: 18, label: "3 tháng",  tag: "Nhanh nhất" },
        { months: 6,  rate: 15, label: "6 tháng",  tag: "Phổ biến" },
        { months: 12, rate: 12, label: "12 tháng", tag: "Lãi thấp nhất" },
    ]),
    groupLink: "",
};

class ConfigService {
    async get() {
        try {
            const doc = await databases.getDocument(DB(), COL, DOC);
            return this._parse(doc);
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") {
                return this._parse(DEFAULTS);
            }
            throw err;
        }
    }

    async update({ minAmount, maxAmount, quickAmounts, terms, groupLink }) {
        const data = {};
        if (minAmount    !== undefined) data.minAmount    = Number(minAmount);
        if (maxAmount    !== undefined) data.maxAmount    = Number(maxAmount);
        if (quickAmounts !== undefined) data.quickAmounts = JSON.stringify(quickAmounts);
        if (terms        !== undefined) data.terms        = JSON.stringify(terms);
        if (groupLink    !== undefined) data.groupLink    = String(groupLink);

        try {
            await databases.getDocument(DB(), COL, DOC);
            return await databases.updateDocument(DB(), COL, DOC, data);
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") {
                return await databases.createDocument(DB(), COL, DOC, { ...DEFAULTS, ...data });
            }
            throw err;
        }
    }

    _parse(doc) {
        return {
            minAmount:    doc.minAmount    ?? DEFAULTS.minAmount,
            maxAmount:    doc.maxAmount    ?? DEFAULTS.maxAmount,
            quickAmounts: this._tryParse(doc.quickAmounts, [5_000_000, 10_000_000, 20_000_000, 50_000_000]),
            terms:        this._tryParse(doc.terms, JSON.parse(DEFAULTS.terms)),
            groupLink:    doc.groupLink    || "",
        };
    }

    _tryParse(str, fallback) {
        if (!str) return fallback;
        if (typeof str !== "string") return str;
        try { return JSON.parse(str); } catch { return fallback; }
    }
}

module.exports = { ConfigService };
