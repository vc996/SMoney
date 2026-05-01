// PMT formula: tính tiền trả hàng tháng (gốc + lãi đều)
function calcMonthlyPayment(principal, annualRatePercent, termMonths) {
    const r = annualRatePercent / 100 / 12;
    if (r === 0) return Math.ceil(principal / termMonths);
    const pmt = (principal * r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
    return Math.ceil(pmt);
}

function calcTotalRepayable(monthlyPayment, termMonths) {
    return monthlyPayment * termMonths;
}

function calcNextPaymentDate(fromDate, installmentsPaid) {
    const d = new Date(fromDate);
    d.setMonth(d.getMonth() + installmentsPaid + 1);
    return d.toISOString();
}

function calcDueDate(startDate, termMonths) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + termMonths);
    return d.toISOString();
}

// Phí phạt chậm trả: 0.1%/ngày
function calcLateFee(overdueAmount, daysLate) {
    return Math.ceil(overdueAmount * 0.001 * daysLate);
}

module.exports = { calcMonthlyPayment, calcTotalRepayable, calcNextPaymentDate, calcDueDate, calcLateFee };
