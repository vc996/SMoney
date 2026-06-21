const { UserService } = require("../service/user.service");

const userSvc = new UserService();

async function getProfileHandler(context) {

    const { payload, res } = context;

    const user = await userSvc.getById(payload.userId);

    return res.json({
        success: true,
        data: user,
    });

}

module.exports = {
    getProfileHandler,
};