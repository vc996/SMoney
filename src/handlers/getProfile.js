const { UserService } = require("../service/user.service");
const userService = new UserService();

async function authHandler(context) {
    const { payload, res, error } = context;
    const { userId, authUser } = payload;

    try {
        context.log("=> [2] Handler getProfile đang xử lý...");
        const dbUser = await userService.ensureProfileExists(userId);

        return res.json({
            success: true,
            user: {
                id: userId,
                name: authUser.name,
                email: authUser.email,
                labels: authUser.labels || [],
                status: authUser.status,

                createdAt: authUser.$createdAt,
                updatedAt: authUser.$updatedAt,

                balance: dbUser.balance || 0,
                totalCommission: dbUser.totalCommission || 0,
                totalOrders: dbUser.totalOrders || 0
            }
        }, 200);

    } catch (err) {
        if (context.error) {
            context.error(`[Auth Handler Error]: ${err.message}`);
        }

        return res.json({
            success: false,
            message: "Có lỗi xảy ra khi đồng bộ dữ liệu ví tài chính."
        }, 500);
    }
}

module.exports = { authHandler };