const { Client, Account } = require("node-appwrite");
const { UserService } = require("../service/user.service");
const { CacheService } = require("../security/cache.service");
const { RateLimitService } = require("../security/rateLimit.service");
const { JwtService } = require("../security/jwt.service");

const cache = new CacheService();
const rateLimitIP = new RateLimitService(500);
const userSvc = new UserService();

async function authHandler({ payload, req, res, log, error }) {
    const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, JWT_SECRET } = process.env;

    const jwt = payload?.jwt;
    if (!jwt) {
        return res.json({ success: false, message: "Thiếu JWT" }, 400);
    }

    const ip = req.headers["x-forwarded-for"] || "unknown";
    if (!rateLimitIP.check(ip)) {
        return res.json({ success: false, message: "Quá nhiều yêu cầu, thử lại sau" }, 429);
    }

    const client = new Client()
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setJWT(jwt);

    const accountSvc = new Account(client);
    let appwriteUser;
    try {
        appwriteUser = await accountSvc.get();
    } catch (err) {
        return res.json({ success: false, message: "JWT không hợp lệ" }, 401);
    }

    const userId = appwriteUser.$id;

    const cached = cache.getCache(userId);
    if (cached) return res.json({ success: true, ...cached });

    try {
        const user = await userSvc.getOrCreate(userId);

        const jwtService = new JwtService(JWT_SECRET);
        const token = jwtService.sign({ userId, kycStatus: user.kycStatus });

        const responseData = {
            userId,
            token,
            kycStatus: user.kycStatus,
            creditScore: user.creditScore,
            activeLoansCount: user.activeLoansCount,
        };

        cache.setCache(userId, responseData);
        log(`Auth success: user ${userId}`);

        return res.json({ success: true, ...responseData });
    } catch (err) {
        error("Auth error: " + err.message);
        return res.json({ success: false, message: "Lỗi server" }, 500);
    }
}

module.exports = { authHandler };
