const { UserService } = require("../service/user.service");
const userService = new UserService();

async function authHandler(context) {
    const { payload, res } = context;
    const { userId, authUser } = payload;

    try {
        const dbUser = await userService.ensureProfileExists(userId);

        return res.json({
            success: true,
            user: {
                id: userId,
                name: authUser.name,
                email: authUser.email,

                balance: dbUser.balance ?? 0,
                totalCommission: dbUser.totalCommission ?? 0,
                totalOrders: dbUser.totalOrders ?? 0
            }
        }, 200);

    } catch (err) {
        if (context.error) {
            context.error(`[Auth Handler Error]: ${err.message}`);
        }

        return res.json({
            success: false,
            message: "Có lỗi xảy ra khi lấy thông tin tài khoản."
        }, 500);
    }
}

module.exports = { authHandler };