const { databases } = require("../config/appwrite.config");

const DB = () => process.env.APPWRITE_DATABASE_ID;
const COL = "kyc_submissions";

class KycService {
    async submit({ userId, fullName, cccdNumber, phoneNumber }) {
        const id = String(userId);
        // submittedAt / reviewedAt dùng $createdAt / $updatedAt của Appwrite — không lưu riêng
        const data = { userId: id, fullName, cccdNumber, phoneNumber, status: "pending" };

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
        const data = { status: approved ? "approved" : "rejected" };
        if (!approved && rejectionReason) data.rejectionReason = rejectionReason;
        // reviewedAt tự cập nhật qua $updatedAt của Appwrite
        return await databases.updateDocument(DB(), COL, String(userId), data);
    }

    format(kyc) {
        if (!kyc) return null;
        return {
            userId: kyc.userId,
            fullName: kyc.fullName,
            cccdNumber: kyc.cccdNumber ? `****${kyc.cccdNumber.slice(-4)}` : null,
            phoneNumber: kyc.phoneNumber ? `****${kyc.phoneNumber.slice(-3)}` : null,
            status: kyc.status,
            rejectionReason: kyc.rejectionReason || null,
            submittedAt: kyc.$createdAt,   // Appwrite system field
            reviewedAt: kyc.status !== "pending" ? kyc.$updatedAt : null,
        };
    }
}

module.exports = { KycService };
