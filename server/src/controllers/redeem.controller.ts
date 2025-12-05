import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import User from '../model/user.model';
import Withdrawal from '../model/withdrawal.model';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/customErrors';
import { AuthenticatedRequest } from '../middleware/auth.middleware'; // Import AuthenticatedRequest

const MIN_POINTS_TO_REDEEM = 20; // Minimum points required for a redemption request
const POINTS_TO_NAIRA_CONVERSION = 500; // 1 point = 500 Naira (Needs confirmation)

class RedeemController {
  redeemPoints = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    const { bankDetails } = req.body; // Expecting { accountName, accountNumber, bankName }
    const pointsToRedeem = req.body.points;

    if (user.role !== 'user') {
      throw new BadRequestError('Only users can initiate redemption requests.');
    }

    if (!bankDetails || !bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.bankName) {
      throw new BadRequestError('Bank details (accountName, accountNumber, bankName) are required.');
    }

    const userInDb = await User.findById(user._id);

    if (!userInDb) {
      throw new NotFoundError('User not found.');
    }

    const availablePoints = userInDb.wallet.balance;

    if (availablePoints < MIN_POINTS_TO_REDEEM) {
      return res.status(400).json({ error: `Insufficient points to redeem. Minimum ${MIN_POINTS_TO_REDEEM} points required.` });
    }

    const amountNaira = pointsToRedeem * POINTS_TO_NAIRA_CONVERSION;

    // Create a new withdrawal request
    const withdrawalRequest = await Withdrawal.create({
      userId: user._id,
      pointsRedeemed: pointsToRedeem,
      amountNaira: amountNaira,
      bankDetails: bankDetails,
      status: 'pending',
      requestedAt: new Date(),
    });

    // Deduct points from user's wallet
    userInDb.wallet.balance -= pointsToRedeem;
    await userInDb.save();

    res.status(200).json({
      success: true,
      message: 'Redemption request submitted successfully. It will be reviewed by an admin.',
      data: {
        withdrawalRequest,
        newBalance: userInDb.wallet.balance,
      },
    });
  });

  getRedemptionHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    // Filter by user role if necessary, though this endpoint is likely for users only
    if (user.role !== 'user') {
      throw new ForbiddenError('Only users can view their redemption history.');
    }

    // Find all withdrawal requests for this user, sorted by requestedAt date
    const redemptionHistory = await Withdrawal.find({ userId: user._id })
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: redemptionHistory.length,
      data: redemptionHistory,
    });
  });
}

export default new RedeemController();
