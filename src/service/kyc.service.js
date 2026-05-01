const { databases } = require("../config/appwrite.config");
const { UserService } = require("./user.service");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "kyc_submissions";

const userSvc = new UserService();

class KycService {
    async submit({ userId, fullName, cccdNumber, phoneNumber }) {
        const id   = String(userId);
        const data = { userId: id, fullName, cccdNumber, phoneNumber, status: "pending" };

        let doc;
        try {
            const existing = await databases.getDocument(DB(), COL, id);
            if (existing.status === "approved") throw new Error("KYC đã được duyệt, không thể nộp lại");
            doc = await databases.updateDocument(DB(), COL, id, data);
        } catch (err) {
            if (err.code === 404 || err.type === "document_not_found") {
                doc = await databases.createDocument(DB(), COL, id, data);
            } else {
                throw err;
            }
        }

        // Sync kycStatus → users (luôn chạy sau khi kyc_submissions đã được lưu)
        await userSvc.updateKycStatus(userId, "pending");
        return doc;
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
        const id        = String(userId);
        const newStatus = approved ? "approved" : "rejected";

        // Thử gộp 1 write, fallback về 2-step nếu schema chưa có rejectionReason
        let doc;
        try {
            const updates = { status: newStatus };
            if (!approved && rejectionReason) updates.rejectionReason = rejectionReason;
            doc = await databases.updateDocument(DB(), COL, id, updates);
        } catch (err) {
            // attribute_unknown → schema chưa có rejectionReason → chỉ cập nhật status
            if (rejectionReason && (err.type === "attribute_unknown" || err.code === 400)) {
                doc = await databases.updateDocument(DB(), COL, id, { status: newStatus });
            } else {
                throw err;
            }
        }

        // Sync kycStatus → users
        await userSvc.updateKycStatus(userId, newStatus);
        return doc;
    }

    format(kyc) {
        if (!kyc) return null;
        return {
            userId:          kyc.userId,
            fullName:        kyc.fullName,
            cccdNumber:      kyc.cccdNumber  ? `****${kyc.cccdNumber.slice(-4)}`  : null,
            phoneNumber:     kyc.phoneNumber ? `****${kyc.phoneNumber.slice(-3)}` : null,
            status:          kyc.status,
            rejectionReason: kyc.rejectionReason || null,
            submittedAt:     kyc.$createdAt,
            reviewedAt:      kyc.status !== "pending" ? kyc.$updatedAt : null,
        };
    }
}

module.exports = { KycService };
