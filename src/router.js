const { authHandler } = require("./handlers/auth");
const { getDashboardHandler } = require("./handlers/dashboard");
const { createLoanHandler, repayHandler, getLoanHandler, getLoansHandler, getTransactionsHandler, updateLoanStatusHandler } = require("./handlers/loan");
const { submitKycHandler, getKycStatusHandler, reviewKycHandler } = require("./handlers/kyc");
const { authMiddleware } = require("./middleware/auth.middleware");

const PROTECTED = new Set([
    "get_dashboard",
    "create_loan",
    "repay",
    "get_loan",
    "get_loans",
    "get_transactions",
    "submit_kyc",
    "get_kyc_status",
    "review_kyc",
    "update_loan_status",
]);

async function router(context) {
    const { payload, res } = context;
    const action = payload?.action || "auth";

    if (PROTECTED.has(action)) {
        const authError = await authMiddleware(context);
        if (authError) return authError;
    }

    switch (action) {
        case "auth":               return await authHandler(context);
        case "get_dashboard":      return await getDashboardHandler(context);
        case "create_loan":        return await createLoanHandler(context);
        case "repay":              return await repayHandler(context);
        case "get_loan":           return await getLoanHandler(context);
        case "get_loans":          return await getLoansHandler(context);
        case "get_transactions":   return await getTransactionsHandler(context);
        case "submit_kyc":         return await submitKycHandler(context);
        case "get_kyc_status":     return await getKycStatusHandler(context);
        case "review_kyc":         return await reviewKycHandler(context);
        case "update_loan_status": return await updateLoanStatusHandler(context);
        default:
            return res.json({ success: false, message: `Action '${action}' không tồn tại` }, 404);
    }
}

module.exports = router;
