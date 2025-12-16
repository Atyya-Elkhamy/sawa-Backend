const httpStatus = require('http-status');
const mongoose = require('mongoose');
const accumulatedChargedService = require('../services/accumalatedCharged/accumulated.charged.service');
const catchAsync = require('../utils/catchAsync');
const chargePrizeService = require('../services/accumalatedCharged/chargePrize.service');
const { storeService } = require('../services');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');
const boughtGiftsService = require('../services/boughtGifts.service');
const profileService = require('../services/profile.service');

const collectPrize = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { prizeId } = req.params;

  if (!prizeId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Prize ID is required', 'رقم الجائزة مطلوب');
  }

  const prize = await chargePrizeService.getChargePrizeById(prizeId);
  if (!prize) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Prize not found', 'الجائزة غير موجودة');
  }

  const { requiredPoints, items, gifts, category, vipLevel, vipDays, proMonths } = prize;
  const period = category;

  try {
    // Collect prize points (deduct/consume the required points for this period)
    const result = await accumulatedChargedService.collectPrize(userId, requiredPoints, period);

    // Send items and gifts to user (filter out null/undefined items and gifts)
    const validItems = items.filter(({ item }) => item != null);
    const validGifts = gifts.filter(({ gift }) => gift != null);

    await Promise.all(validItems.map(({ item: itemId, days }) => storeService.addProductToBoughtItems(userId, itemId, days)));
    await Promise.all(validGifts.map(({ gift: giftId, quantity }) => boughtGiftsService.addGift(userId, giftId, quantity)));

    // Add VIP if present
    logger.debug('Checking VIP subscription conditions');
    console.log('vipLevel', vipLevel, vipDays);
    if (vipLevel && vipLevel > 0 && vipDays && vipDays > 0) {
      try {
        logger.info(`Subscribing VIP for user ${userId} for ${vipDays} days`);
        await profileService.subscribeVip(userId, vipLevel, vipDays, true);
      } catch (error) {
        logger.error(`Error subscribing VIP: ${error.message}`);
      }
    }

    // Add Pro if present
    if (proMonths && proMonths > 0) {
      try {
        logger.info(`Subscribing Pro for user ${userId} for ${proMonths} months`);
        await profileService.subscribePro(userId, proMonths, true);
      } catch (error) {
        logger.error(`Error subscribing Pro: ${error.message}`);
      }
    }

    res.status(200).send({ ...result, claimed: true });
  } catch (err) {
    throw err;
  }
});

const getAccumulation = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const userData = await accumulatedChargedService.getAccumulation(userId);
  const prizes = await chargePrizeService.getAllChargePrizes();

  // i want to return remaining time before the end of the week (friday) like x days x hours x minutes x seconds
  const endOfWeekTimeLeft = accumulatedChargedService.getTimeLeft('weekly');
  const endOfMonthTimeLeft = accumulatedChargedService.getTimeLeft('monthly');

  res.status(200).send({ userData, prizes, endOfWeekTimeLeft, endOfMonthTimeLeft });
});

const getAccumulationBerPeriod = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const { period } = req.query;
  const userData = await accumulatedChargedService.getAccumulation(userId);
  const prizes = await chargePrizeService.getChargePrizesBerCategory(period);
  const timeLeft = accumulatedChargedService.getTimeLeft(period);
  const topThree = await accumulatedChargedService.getTopThree(period);

  res.status(200).send({ userData, prizes, timeLeft, topThree });
});

const getTopThree = catchAsync(async (req, res) => {
  const { period } = req.query;
  const result = await accumulatedChargedService.getTopThree(period);
  res.status(200).send(result);
});

module.exports = {
  getAccumulation,
  getTopThree,
  collectPrize,
  getAccumulationBerPeriod,
};
