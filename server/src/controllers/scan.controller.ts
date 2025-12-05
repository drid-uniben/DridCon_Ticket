import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import User from '../model/user.model';
import Transaction from '../model/transaction.model';
import tokenService from '../services/token.service';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/customErrors';
import { AuthenticatedRequest } from '../middleware/auth.middleware'; // Import AuthenticatedRequest
import logger from '../utils/logger'; // Import logger

const POINT_CONVERSION_RATE_GRAMS = 500; // 500 grams = 1 point
const roundToTwo = (value: number) => Math.round(value * 100) / 100;
const TRANSACTION_JWT_EXPIRY = '1h'; // QR code JWT expires in 1 hour

class ScanController {
  // Agent generates a transaction and QR code JWT
  generateTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const agent = req.user;
  const { weightInGrams: rawWeight } = req.body;
  const weightInGrams = Number(rawWeight);
  const normalizedWeight = roundToTwo(weightInGrams);

    if (agent.role !== 'agent') {
      throw new ForbiddenError('Only agents can generate transactions.');
    }

    if (!Number.isFinite(weightInGrams) || weightInGrams <= 0) {
      throw new BadRequestError('Valid weightInGrams (number > 0) is required.');
    }

  const pointsAwarded = roundToTwo(normalizedWeight / POINT_CONVERSION_RATE_GRAMS);
    if (pointsAwarded <= 0) {
      throw new BadRequestError('Weight is too low to award points.');
    }

    // Create a new pending transaction
    const transaction = await Transaction.create({
      agentId: agent._id,
  weightInGrams: normalizedWeight,
      pointsAwarded,
      status: 'pending',
    });

    // Generate a JWT for the transaction to be embedded in the QR code
    const transactionToken = tokenService.generateToken(
      { transactionId: transaction._id.toString() },
      process.env.JWT_SECRET_TRANSACTION!, // Assuming a separate secret for transaction JWTs
      TRANSACTION_JWT_EXPIRY
    );

    res.status(201).json({
      success: true,
      message: 'Transaction generated successfully. Present QR code to user.',
      data: {
        transactionId: transaction._id,
  pointsAwarded,
  weightInGrams: normalizedWeight,
        transactionToken, // This will be encoded in the QR code
      },
    });
  });

  // User claims the transaction by scanning the QR code
  claimTransaction = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    const { transactionToken } = req.body; // User's app sends the scanned JWT

    if (user.role !== 'user') {
      throw new ForbiddenError('Only users can claim transactions.');
    }

    if (!transactionToken) {
      throw new BadRequestError('Transaction token is required.');
    }

    let payload: { transactionId: string };
    try {
      payload = tokenService.verifyToken(transactionToken, process.env.JWT_SECRET_TRANSACTION!) as { transactionId: string };
    } catch (error) {
      logger.error('Error verifying transaction token:', error); // Add this log
      throw new UnauthorizedError('Invalid or expired transaction QR code.');
    }

    const transaction = await Transaction.findById(payload.transactionId);

    if (!transaction) {
      throw new NotFoundError('Transaction not found.');
    }

    if (transaction.status === 'claimed') {
      throw new BadRequestError('This transaction has already been claimed.');
    }

    // Ensure the transaction has not expired (check if within the JWT expiry or if we add a separate expiry field to transaction model)
    // For now, JWT expiry handles this.

    // Update user's wallet
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { $inc: { 'wallet.balance': transaction.pointsAwarded } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
        throw new NotFoundError('User not found during points update.');
    }

    // Update transaction status
    transaction.status = 'claimed';
    transaction.userId = user._id;
    transaction.claimedAt = new Date();
    await transaction.save();

    const roundedBalance = roundToTwo(updatedUser.wallet.balance);
    await User.findByIdAndUpdate(user._id, { 'wallet.balance': roundedBalance });
    res.status(200).json({
      success: true,
      message: 'Points claimed successfully!',
      data: {
        transactionId: transaction._id,
        pointsAwarded: transaction.pointsAwarded,
        newBalance: roundedBalance, // Return updated balance
      },
    });
  });

  // Agent: view all transactions they generated
getAgentScanHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const agent = req.user;

  if (agent.role !== "agent") {
    throw new ForbiddenError("Only agents can view scan history.");
  }

  // Fetch only claimed transactions
  const history = await Transaction.find({ 
      agentId: agent._id,
      status: 'claimed'
    })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: history.length,
    data: history,
  });
});



  getScanHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;

    // Filter by user role if necessary, though this endpoint is likely for users only
    if (user.role !== 'user') {
      throw new ForbiddenError('Only users can view their scan history.');
    }

    // Find all claimed transactions for this user, sorted by claimedAt date
    const scanHistory = await Transaction.find({ userId: user._id, status: 'claimed' })
      .populate('agentId', 'name email') // Populate agent details who processed the scan
      .sort({ claimedAt: -1 });

    res.status(200).json({
      success: true,
      count: scanHistory.length,
      data: scanHistory,
    });
  });
}

export default new ScanController();
