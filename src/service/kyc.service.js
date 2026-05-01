const { databases } = require("../config/appwrite.config");

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL = "kyc_submissions";

class KycService {
    async submit({ userId, fullName, cccdNumber, phoneNumber }) {
        const id = String(userId);
        const now = new Date().toISOString();
        const data = { userId: id, fullName, cccdNumber, phoneNumber, status: "pending", submittedAt: now, reviewedAt: null };

        try {
            const existing = await databases.getDocument(DB(), COL, id);
            if (existing.status === "approved") throw new Error("KYC đã được duyệt, không thể nộp lại");
            return await databases.updateDocument(DB(), COL, id, data);
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") {
                return await databases.createDocument(DB(), COL, id, data);
            }
            throw err;
        }
    }

    async getByUser(userId) {
        try {
            return await databases.getDocument(DB(), COL, String(userId));
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") return null;
            throw err;
        }
    }

    async review(userId, { approved, rejectionReason = null }) {
        return await databases.updateDocument(DB(), COL, String(userId), {
            status: approved ? "approved" : "rejected",
            rejectionReason: approved ? null : rejectionReason,
            reviewedAt: new Date().toISOString(),
        });
    }

    format(kyc) {
        if (!kyc) return null;
        return {
            userId: kyc.userId,
            fullName: kyc.fullName,
            cccdNumber: kyc.cccdNumber ? `****${kyc.cccdNumber.slice(-4)}` : null,
            phoneNumber: kyc.phoneNumber ? `****${kyc.phoneNumber.slice(-3)}` : null,
            status: kyc.status,
            submittedAt: kyc.submittedAt,
            reviewedAt: kyc.reviewedAt,
        };
    }
}

module.exports = { KycService };
