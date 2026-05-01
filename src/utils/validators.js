const SUPPORTED_CURRENCIES = ["VNDC", "VND", "USDT"];
const SUPPORTED_TERMS = [3, 6, 12];
const MIN_AMOUNT = 1_000_000;
const MAX_AMOUNT = 500_000_000;

function validateCreateLoan({ amount, currency, termMonths }) {
    const errors = [];
    if (!amount || typeof amount !== "number" || amount < MIN_AMOUNT || amount > MAX_AMOUNT)
        errors.push(`Số tiền vay phải từ ${MIN_AMOUNT.toLocaleString()} đến ${MAX_AMOUNT.toLocaleString()}`);
    if (!SUPPORTED_CURRENCIES.includes(currency))
        errors.push(`Đơn vị tiền tệ phải là: ${SUPPORTED_CURRENCIES.join(", ")}`);
    if (!SUPPORTED_TERMS.includes(termMonths))
        errors.push(`Kỳ hạn phải là: ${SUPPORTED_TERMS.join(", ")} tháng`);
    return errors;
}

function validateRepay({ loanId, amount }) {
    const errors = [];
    if (!loanId) errors.push("Thiếu loanId");
    if (!amount || typeof amount !== "number" || amount <= 0) errors.push("Số tiền phải lớn hơn 0");
    return errors;
}

function validateKYC({ fullName, cccdNumber, phoneNumber }) {
    const errors = [];
    if (!fullName || fullName.trim().length < 2) errors.push("Họ tên không hợp lệ");
    if (!cccdNumber || !/^\d{9,12}$/.test(cccdNumber)) errors.push("Số CCCD/CMND phải gồm 9–12 chữ số");
    if (!phoneNumber || !/^(0|\+84)\d{9,10}$/.test(phoneNumber.replace(/\s/g, ""))) errors.push("Số điện thoại không hợp lệ");
    return errors;
}

module.exports = { validateCreateLoan, validateRepay, validateKYC };
