const { authHandler } = require("./handlers/auth");
const { getDashboardHandler } = require("./handlers/dashboard");
const { createLoanHandler, approveLoanHandler, rejectLoanHandler, repayHandler, getLoanHandler, getLoansHandler, getTransactionsHandler, updateLoanStatusHandler } = require("./handlers/loan");
const { submitKycHandler, getKycStatusHandler, reviewKycHandler } = require("./handlers/kyc");
const { getConfigHandler, updateConfigHandler } = require("./handlers/config");
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
        case "approve_loan":       return await approveLoanHandler(context);
        case "reject_loan":        return await rejectLoanHandler(context);
        case "get_config":         return await getConfigHandler(context);
        case "update_config":      return await updateConfigHandler(context);
        default:
            return res.json({ success: false, message: `Action '${action}' không tồn tại` }, 404);
    }
}

module.exports = router;
