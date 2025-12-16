module.exports = {
  transferConversionRates: {
    userDiamondToUSD: 1 / 1700,
    creditAgencyDiamondToUSD: 1 / 1930,
  },
  salaryConversionRates: {
    hostDiamondToUSD: 1 / 2790,
    agencyDiamondToUSD: 1 / 12550,
  },
  endOfMonthProcessing: {
    resetTargets: true,
    calculatePayouts: true,
    transferToWithdrawable: true,
  },
};
