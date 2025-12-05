import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import Transaction from '../model/transaction.model';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

class AgentController {
  getDashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const currentUser = req.user;

    if (currentUser.role === 'agent') {
      // Aggregate basic stats for the agent
      const pendingCount = await Transaction.countDocuments({ agentId: currentUser._id, status: 'pending' });
      const claimedCount = await Transaction.countDocuments({ agentId: currentUser._id, status: 'claimed' });
      const totalWeight = await Transaction.aggregate([
        { $match: { agentId: currentUser._id } },
        { $group: { _id: null, total: { $sum: '$weightInGrams' } } },
      ]);

      const recent = await Transaction.find({ agentId: currentUser._id })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(10);

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: currentUser._id,
            name: currentUser.name,
            email: currentUser.email,
            allocatedFunds: currentUser.agentProfile?.allocatedFunds || 0,
            walletBalance: currentUser.wallet?.balance || 0,
          },
          stats: {
            pendingCount,
            claimedCount,
            totalWeight: totalWeight[0]?.total || 0,
          },
          recentTransactions: recent,
        },
      });
    }
  });
}

export default new AgentController();
