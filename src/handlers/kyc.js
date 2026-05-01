const { KycService } = require("../service/kyc.service");
const { UserService } = require("../service/user.service");
const { validateKYC } = require("../utils/validators");

const kycSvc  = new KycService();
const userSvc = new UserService();

// POST action: submit_kyc
async function submitKycHandler({ payload, res, log, error }) {
    const { userId, fullName, cccdNumber, phoneNumber } = payload;

    const errors = validateKYC({ fullName, cccdNumber, phoneNumber });
    if (errors.length) return res.json({ success: false, message: errors[0] }, 400);

    try {
        const kyc = await kycSvc.submit({ userId, fullName, cccdNumber, phoneNumber });
        log(`KYC submitted: ${userId}`);
        return res.json({
            success: true,
            message: "Hồ sơ KYC đã được gửi, vui lòng chờ xét duyệt (1–2 ngày làm việc)",
            kyc:     kycSvc.format(kyc),
        });
    } catch (err) {
        if (err.message.includes("đã được duyệt"))
            return res.json({ success: false, message: err.message }, 400);
        error("submitKyc: " + err.message);
        return res.json({ success: false, message: "Không thể gửi hồ sơ" }, 500);
    }
}

// GET action: get_kyc_status
async function getKycStatusHandler({ payload, res, error }) {
    const { userId } = payload;
    try {
        const kyc    = await kycSvc.getByUser(userId);
        const status = kyc?.status || "none";

        const message = {
            none:     "Chưa nộp hồ sơ KYC",
            pending:  "Hồ sơ đang được xét duyệt",
            approved: "Xác minh danh tính thành công",
            rejected: `Hồ sơ bị từ chối: ${kyc?.rejectionReason || "Thông tin không hợp lệ"}`,
        }[status] ?? "Chưa nộp hồ sơ KYC";

        return res.json({ success: true, kycStatus: status, message, kyc: kycSvc.format(kyc) });
    } catch (err) {
        error("getKycStatus: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

// POST action: review_kyc (admin)
async function reviewKycHandler({ payload, res, log, error }) {
    const { adminKey, targetUserId, approved, rejectionReason } = payload;

    if (adminKey !== process.env.ADMIN_KEY)
        return res.json({ success: false, message: "Không có quyền admin" }, 403);
    if (!targetUserId)
        return res.json({ success: false, message: "Thiếu targetUserId" }, 400);

    try {
        const kyc = await kycSvc.review(targetUserId, { approved, rejectionReason });

        // Cộng điểm tín dụng khi KYC được duyệt lần đầu
        if (approved) await userSvc.updateCreditScore(targetUserId, +100);

        log(`KYC ${approved ? "APPROVED" : "REJECTED"}: ${targetUserId}`);
        return res.json({
            success: true,
            message: approved ? "Đã duyệt KYC" : "Đã từ chối KYC",
            kyc:     kycSvc.format(kyc),
        });
    } catch (err) {
        error("reviewKyc: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

module.exports = { submitKycHandler, getKycStatusHandler, reviewKycHandler };
