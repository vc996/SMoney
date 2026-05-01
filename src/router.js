const { authHandler }           = require("./handlers/auth");
const { getDashboardHandler }   = require("./handlers/dashboard");
const { getConfigHandler, updateConfigHandler } = require("./handlers/config");
const { getTiersHandler } = require("./handlers/tier");
const {
    createLoanHandler, approveLoanHandler, rejectLoanHandler,
    repayHandler, getLoanHandler, getLoansHandler,
    getTransactionsHandler, updateLoanStatusHandler,
} = require("./handlers/loan");
const { submitKycHandler, getKycStatusHandler, reviewKycHandler } = require("./handlers/kyc");
const { authMiddleware } = require("./middleware/auth.middleware");

// Actions yêu cầu JWT
const PROTECTED = new Set([
    "get_dashboard",
    "create_loan", "repay", "get_loan", "get_loans", "get_transactions",
    "submit_kyc", "get_kyc_status",
    // Admin actions dùng adminKey riêng, không cần JWT
]);

async function router(context) {
    const { payload, res } = context;
    const action = payload?.action || "auth";

    if (PROTECTED.has(action)) {
        const authError = await authMiddleware(context);
        if (authError) return authError;
    }

    switch (action) {
        // ── Auth ──────────────────────────────────────────
        case "auth":               return authHandler(context);

        // ── Dashboard ─────────────────────────────────────
        case "get_dashboard":      return getDashboardHandler(context);

        // ── Config ────────────────────────────────────────
        case "get_config":         return getConfigHandler(context);
        case "update_config":      return updateConfigHandler(context);

        // ── Loan Tiers ────────────────────────────────────
        case "get_tiers":          return getTiersHandler(context);

        // ── Loans ─────────────────────────────────────────
        case "create_loan":        return createLoanHandler(context);
        case "approve_loan":       return approveLoanHandler(context);
        case "reject_loan":        return rejectLoanHandler(context);
        case "repay":              return repayHandler(context);
        case "get_loan":           return getLoanHandler(context);
        case "get_loans":          return getLoansHandler(context);
        case "get_transactions":   return getTransactionsHandler(context);
        case "update_loan_status": return updateLoanStatusHandler(context);

        // ── KYC ───────────────────────────────────────────
        case "submit_kyc":         return submitKycHandler(context);
        case "get_kyc_status":     return getKycStatusHandler(context);
        case "review_kyc":         return reviewKycHandler(context);

        default:
            return res.json({ success: false, message: `Action '${action}' không tồn tại` }, 404);
    }
}

module.exports = router;
