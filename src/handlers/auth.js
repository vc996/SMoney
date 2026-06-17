const { UserService } = require("../service/user.service");

const userService = new UserService();

/**
 * Sau khi auth.middleware xác thực thành công,
 * trả thông tin người dùng cho Frontend.
 */
async function authHandler(context) {

    const { payload, res, error } = context;

    try {

        const user = await userService.getById(payload.userId);

        return res.json({
            success: true,

            user: {
                id: payload.userId,
                role: user.role,
                status: user.status,
                balance: user.balance,
                totalCommission: user.totalCommission,
                totalOrder: user.totalOrder,
            }

        }, 200);

    } catch (err) {

        error(err.message);

        return res.json({
            success: false,
            message: "Không tìm thấy thông tin người dùng."
        }, 404);

    }

}

module.exports = {
    authHandler,
};
