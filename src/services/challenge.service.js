const httpStatus = require('http-status');
const Challenge = require('../models/challenge.model');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const userService = require('./user.service');
const UserCreditTransaction = require('../models/extra/userCreditTransaction.model');

class ChallengeService {
  /**
   * Create a new challenge
   * @param userId
   * @param roomId
   * @param prizeAmount
   * @param choice
   */
  async createChallenge(userId, roomId, prizeAmount, choice) {
    // Validate prize amount
    if (prizeAmount < 50 || prizeAmount > 200) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid prize amount', 'قيمة الجائزة غير صالحة');
    }

    // Check if user has enough credits
    const user = await User.findById(userId);
    if (user.credits < prizeAmount) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Insufficient credits', 'رصيد غير كافي');
    }

    // Deduct credits from user first
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $inc: { credits: -prizeAmount } },
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found', 'المستخدم غير موجود');
    }

    try {
      // Create challenge
      const challenge = await Challenge.create({
        createdBy: userId,
        roomId,
        prizeAmount,
        creatorChoice: choice,
        expiresAt: new Date(Date.now() + 30000), // 30 seconds
      });

      // Set timeout to check expiry
      setTimeout(async () => {
        await this.checkChallengeExpiry(challenge._id);
      }, 31000);

      return {
        challengeId: challenge._id,
        createdBy: userId,
        prizeAmount,
        roomId,
        expiresAt: challenge.expiresAt,
        status: 'active',
      };
    } catch (error) {
      // If challenge creation fails, refund the credits
      await User.findByIdAndUpdate(userId, { $inc: { credits: prizeAmount } });
      throw error;
    }
  }

  /**
   * Accept a challenge
   * @param challengeId
   * @param userId
   * @param choice
   */
  // eslint-disable-next-line class-methods-use-this
  // async acceptChallenge(challengeId, userId, choice) {
  //   const challenge = await Challenge.findById(challengeId);

  //   if (!challenge) {
  //     throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found', 'التحدي غير موجود');
  //   }

  //   if (challenge.status !== 'active') {
  //     throw new ApiError(httpStatus.BAD_REQUEST, 'Challenge is not active', 'التحدي غير نشط');
  //   }

  //   if (challenge.createdBy.toString() === userId) {
  //     throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot accept your own challenge', 'لا يمكنك قبول تحديك الخاص');
  //   }

  //   if (challenge.acceptedBy) {
  //     throw new ApiError(httpStatus.BAD_REQUEST, 'Challenge already accepted', 'تم قبول التحدي بالفعل');
  //   }

  //   // deduct credits from user
  //   await userService.deductUserBalance(userId, challenge.prizeAmount);

  //   // Determine the winner
  //   const { creatorChoice } = challenge;
  //   const acceptorChoice = choice;
  //   let winnerId = null;
  //   let isTie = false;

  //   if (
  //     (creatorChoice === 'rock' && acceptorChoice === 'scissors') ||
  //     (creatorChoice === 'paper' && acceptorChoice === 'rock') ||
  //     (creatorChoice === 'scissors' && acceptorChoice === 'paper')
  //   ) {
  //     // Creator wins
  //     winnerId = challenge.createdBy;
  //   } else if (
  //     (acceptorChoice === 'rock' && creatorChoice === 'scissors') ||
  //     (acceptorChoice === 'paper' && creatorChoice === 'rock') ||
  //     (acceptorChoice === 'scissors' && creatorChoice === 'paper')
  //   ) {
  //     // Acceptor wins
  //     winnerId = userId;
  //   } else {
  //     // It's a tie
  //     isTie = true;
  //   }

  //   // Award prize based on winner
  //   if (isTie) {
  //     // In case of tie, return each user their entry amount
  //     await User.findByIdAndUpdate(challenge.createdBy, { $inc: { credits: challenge.prizeAmount } });
  //     await User.findByIdAndUpdate(userId, { $inc: { credits: challenge.prizeAmount } });
  //   } else {
  //     // Winner takes all
  //     await User.findByIdAndUpdate(winnerId, { $inc: { credits: challenge.prizeAmount * 2 } });
  //   }

  //   // Update challenge
  //   const updatedChallenge = await Challenge.findByIdAndUpdate(
  //     challengeId,
  //     {
  //       acceptedBy: userId,
  //       acceptorChoice: choice,
  //       status: 'completed',
  //       winner: isTie ? null : winnerId,
  //     },
  //     { new: true }
  //   ).populate('createdBy acceptedBy winner', 'name avatar');

  //   const result = {
  //     challengeId: updatedChallenge._id,
  //     creator: {
  //       id: updatedChallenge.createdBy._id,
  //       name: updatedChallenge.createdBy.name,
  //       avatar: updatedChallenge.createdBy.avatar,
  //       choice: updatedChallenge.creatorChoice,
  //     },
  //     acceptor: {
  //       id: updatedChallenge.acceptedBy._id,
  //       name: updatedChallenge.acceptedBy.name,
  //       avatar: updatedChallenge.acceptedBy.avatar,
  //       choice: updatedChallenge.acceptorChoice,
  //     },
  //     prizeAmount: updatedChallenge.prizeAmount,
  //     status: 'completed',
  //   };

  //   if (isTie) {
  //     result.result = 'tie';
  //     result.message = "It's a tie! Both players get their credits back.";
  //   } else {
  //     result.winner = {
  //       id: updatedChallenge.winner._id,
  //       name: updatedChallenge.winner.name,
  //       avatar: updatedChallenge.winner.avatar,
  //       prize: challenge.prizeAmount * 2,
  //     };

  //     result.result =
  //       updatedChallenge.winner._id.toString() === updatedChallenge.createdBy._id.toString() ? 'creator' : 'acceptor';
  //   }

  //   return result;
  // }

  async acceptChallenge(challengeId, userId, choice) {
    try {
      const challenge = await Challenge.findById(challengeId);
      if (!challenge) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Challenge not found', 'التحدي غير موجود');
      }

      if (challenge.status !== 'active') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Challenge not active', 'التحدي غير نشط');
      }

      if (challenge.createdBy.toString() === userId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot accept your own challenge', 'لا يمكنك قبول تحديك الخاص');
      }

      if (challenge.acceptedBy) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Already accepted', 'تم قبول التحدي بالفعل');
      }

      // Deduct acceptor balance (entry fee)
      await userService.deductUserBalance(
        userId,
        challenge.prizeAmount,
        'Challenge entry fee',
        'رسوم دخول التحدي'
      );

      const creatorChoice = challenge.creatorChoice;
      const acceptorChoice = choice;

      let winnerId = null;
      let loserId = null;
      let isTie = false;

      const winningMap = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

      if (creatorChoice === acceptorChoice) {
        isTie = true;
      } else if (winningMap[creatorChoice] === acceptorChoice) {
        winnerId = challenge.createdBy;
        loserId = userId;
      } else {
        winnerId = userId;
        loserId = challenge.createdBy;
      }

      // Update wallets and store transactions
      if (isTie) {
        await Promise.all([
          userService.increaseUserBalance(challenge.createdBy, challenge.prizeAmount, 'Challenge tie refund', 'استرداد التعادل'),
          userService.increaseUserBalance(userId, challenge.prizeAmount, 'Challenge tie refund', 'استرداد التعادل'),
        ]);
      } else {
        // Winner gets double, loser loses entry fee
        await Promise.all([
          userService.increaseUserBalance(winnerId, challenge.prizeAmount * 2, 'Challenge winnings', 'ربح التحدي'),
          UserCreditTransaction.create([
            {
              user: loserId,
              amount: challenge.prizeAmount,
              type: 'debit',
              description: 'You lost the challenge',
              descriptionAr: 'لقد خسرت التحدي'
            }
          ])
        ]);
      }

      // Save challenge result
      const updatedChallenge = await Challenge.findByIdAndUpdate(
        challengeId,
        {
          acceptedBy: userId,
          acceptorChoice: choice,
          status: 'completed',
          winner: isTie ? null : winnerId
        },
        { new: true }
      ).populate('createdBy acceptedBy winner', 'name avatar');

      // Build response
      const result = {
        challengeId: updatedChallenge._id,
        prizeAmount: updatedChallenge.prizeAmount,
        status: 'completed',
        creator: {
          id: updatedChallenge.createdBy._id,
          name: updatedChallenge.createdBy.name,
          avatar: updatedChallenge.createdBy.avatar,
          choice: updatedChallenge.creatorChoice
        },
        acceptor: {
          id: updatedChallenge.acceptedBy._id,
          name: updatedChallenge.acceptedBy.name,
          avatar: updatedChallenge.acceptedBy.avatar,
          choice: updatedChallenge.acceptorChoice
        },
        result: isTie
          ? 'tie'
          : (winnerId.toString() === updatedChallenge.createdBy._id.toString() ? 'creator' : 'acceptor'),
        winner: isTie
          ? null
          : {
            id: updatedChallenge.winner._id,
            name: updatedChallenge.winner.name,
            avatar: updatedChallenge.winner.avatar,
            prize: challenge.prizeAmount * 2,
            message: 'You won',
            messageAr: 'لقد فزت'
          },
        loser: isTie
          ? null
          : {
            id: loserId,
            amountLost: challenge.prizeAmount,
            message: 'You lost',
            messageAr: 'لقد خسرت'
          }
      };

      return result;

    } catch (error) {
      throw error;
    }
  }


  /**
   * Check challenge expiry and refund if needed
   * @param challengeId
   */
  // eslint-disable-next-line class-methods-use-this
  async checkChallengeExpiry(challengeId) {
    // Use findOneAndUpdate to atomically update the challenge
    const challenge = await Challenge.findOneAndUpdate(
      {
        _id: challengeId,
        status: 'active',
        acceptedBy: null,
        isRefunded: false,
        expiresAt: { $lt: new Date() },
      },
      {
        $set: {
          status: 'expired',
          isRefunded: true,
          deletedAt: new Date(Date.now() + 86400000), // 24 hours from now
        },
      },
      { new: true }
    );

    // If no challenge found or already handled, return
    if (!challenge) {
      return null;
    }

    // Refund credits to creator
    await User.findByIdAndUpdate(challenge.createdBy, { $inc: { credits: challenge.prizeAmount } });

    return {
      challengeId: challenge._id,
      status: 'expired',
      refundAmount: challenge.prizeAmount,
      roomId: challenge.roomId,
    };
  }
}

module.exports = new ChallengeService();
