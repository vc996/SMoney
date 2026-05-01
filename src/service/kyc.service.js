const { databases } = require("../config/appwrite.config");
const { UserService } = require("./user.service");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "kyc_submissions";

const userSvc = new UserService();

class KycService {
    /**
     * Nộp hoặc nộp lại hồ sơ KYC.
     * Dùng userId làm document ID → mỗi user chỉ có 1 bản ghi.
     */
    async submit({ userId, fullName, cccdNumber, phoneNumber }) {
        const id   = String(userId);
        const data = { userId: id, fullName, cccdNumber, phoneNumber, status: "pending" };

        let doc;
        try {
            const existing = await databases.getDocument(DB(), COL, id);
            if (existing.status === "approved")
                throw new Error("KYC đã được duyệt, không thể nộp lại");
            // Nộp lại: xoá lý do từ chối cũ
            doc = await databases.updateDocument(DB(), COL, id, { ...data, rejectionReason: null });
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") {
                doc = await databases.createDocument(DB(), COL, id, data);
            } else {
                throw err;
            }
        }

        await userSvc.updateKycStatus(userId, "pending");
        return doc;
    }

    /** Lấy hồ sơ KYC của user, trả null nếu chưa nộp */
    async getByUser(userId) {
        try {
            return await databases.getDocument(DB(), COL, String(userId));
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") return null;
            throw err;
        }
    }

    /**
     * Admin xét duyệt hồ sơ.
     * Ghi 1 lần duy nhất (schema đã có rejectionReason nullable).
     */
    async review(userId, { approved, rejectionReason = null }) {
        const id        = String(userId);
        const newStatus = approved ? "approved" : "rejected";

        const doc = await databases.updateDocument(DB(), COL, id, {
            status:          newStatus,
            rejectionReason: approved ? null : (rejectionReason || null),
        });

        await userSvc.updateKycStatus(userId, newStatus);
        return doc;
    }

    format(kyc) {
        if (!kyc) return null;
        return {
            userId:          kyc.userId,
            fullName:        kyc.fullName,
            cccdNumber:      kyc.cccdNumber  || null,
            phoneNumber:     kyc.phoneNumber ? `****${kyc.phoneNumber.slice(-3)}` : null,
            status:          kyc.status,
            rejectionReason: kyc.rejectionReason || null,
            submittedAt:     kyc.$createdAt,
            reviewedAt:      kyc.status !== "pending" ? kyc.$updatedAt : null,
        };
    }
}

module.exports = { KycService };
