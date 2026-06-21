const { UserService } = require("../service/user.service");
const userService = new UserService();

async function authHandler(context) {
    const { payload, res, error } = context;
    const { userId, authUser } = payload;

    try {
        // 1. Chỉ truyền userId xuống để kiểm tra/tạo dòng dữ liệu rỗng (balance = 0, ...)
        const dbUser = await userService.ensureProfileExists(userId);

        // 2. 🎯 TIẾN HÀNH GỘP: Trả về số dư bằng 0 cùng thời gian trích xuất từ AuthUser
        return res.json({
            success: true,
            user: {
                // Thông tin định danh & phân quyền từ Auth
                id: userId,
                name: authUser.name,
                email: authUser.email,
                labels: authUser.labels || [],
                status: authUser.status,

                // 🌟 ĐỒNG BỘ THỜI GIAN: Bốc thẳng thời gian tạo tài khoản gốc từ Auth cấp sang
                createdAt: authUser.$createdAt,
                updatedAt: authUser.$updatedAt,

                // Thông tin tài chính lấy từ bảng Database Users
                balance: dbUser.balance || 0,
                totalCommission: dbUser.totalCommission || 0,
                totalOrders: dbUser.totalOrders || 0
            }
        }, 200);

    } catch (err) {
        if (typeof error === 'function') error(`[Auth Handler Error]: ${err.message}`);
        return res.json({
            success: false,
            message: "Có lỗi xảy ra khi đồng bộ dữ liệu ví tài chính."
        }, 500);
    }
}

module.exports = { authHandler };