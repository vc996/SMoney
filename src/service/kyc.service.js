const { databases, ID, Query } = require("../config/appwrite.config");
const { UserService } = require("./user.service");

const DB  = () => process.env.APPWRITE_DATABASE_ID;
const COL = "kyc_submissions";

const userSvc = new UserService();

class KycService {
    /** Tìm document KYC theo userId field, trả null nếu chưa có */
    async getByUser(userId) {
        const res = await databases.listDocuments(DB(), COL, [
            Query.equal("userId", String(userId)),
            Query.limit(1),
        ]);
        return res.total > 0 ? res.documents[0] : null;
    }

    /** Nộp hoặc nộp lại hồ sơ KYC */
    async submit({ userId, fullName, cccdNumber, phoneNumber }) {
        const uid  = String(userId);
        const data = { userId: uid, fullName, cccdNumber, phoneNumber, status: "pending", rejectionReason: null };

        const existing = await this.getByUser(uid);

        let doc;
        if (existing) {
            if (existing.status === "approved")
                throw new Error("KYC đã được duyệt, không thể nộp lại");
            // Nộp lại: xoá lý do từ chối cũ
            doc = await databases.updateDocument(DB(), COL, existing.$id, {
                ...data,
                rejectionReason: null,
            });
        } else {
            doc = await databases.createDocument(DB(), COL, ID.unique(), data);
        }

        await userSvc.updateKycStatus(uid, "pending");
        return doc;
    }

    /** Admin xét duyệt hồ sơ */
    async review(userId, { approved, rejectionReason = null }) {
        const uid     = String(userId);
        const newStatus = approved ? "approved" : "rejected";

        const existing = await this.getByUser(uid);
        if (!existing) throw new Error("Không tìm thấy hồ sơ KYC");

        const doc = await databases.updateDocument(DB(), COL, existing.$id, {
            status:          newStatus,
            rejectionReason: approved ? null : (rejectionReason || null),
        });

        await userSvc.updateKycStatus(uid, newStatus);
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
