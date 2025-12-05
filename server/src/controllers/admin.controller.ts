import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import logger from '../utils/logger';
import User from '../model/user.model';
import Withdrawal from '../model/withdrawal.model';
import emailService from '../services/email.service';
import generateSecurePassword from '../utils/passwordGenerator';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/customErrors';
// import { Document, Types } from 'mongoose'; // Removed unused imports
import { AuthenticatedRequest } from '../middleware/auth.middleware'; // Import AuthenticatedRequest

class AdminController {
  inviteAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.user;
    const { email, name } = req.body;

    if (!email || !name) {
      throw new BadRequestError('Email and name are required to invite an agent.');
    }

    if (adminUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can invite agents.');
    }

    // Check if user with this email already exists
    let agent = await User.findOne({ email });
    if (agent && agent.role === 'agent') {
      throw new BadRequestError('An agent with this email already exists.');
    } else if (agent && agent.role !== 'agent') {
      throw new BadRequestError('A user with this email already exists with a different role.');
    }

    const generatedPassword = generateSecurePassword();

    agent = await User.create({
      name,
      email,
      password: generatedPassword,
      role: 'agent',
      isActive: true,
      agentProfile: {
        allocatedFunds: 0,
        manager: adminUser._id,
      },
    });

    // Send credentials email to the new agent
    await emailService.sendAgentCredentialsEmail(agent.email, agent.name || agent.email, generatedPassword);

    logger.info(`Admin ${adminUser._id} invited new agent: ${agent._id} (${agent.email})`);

    res.status(201).json({
      success: true,
      message: `Agent ${name} (${email}) invited successfully and credentials sent.`,
      data: { agentId: agent._id, email: agent.email, name: agent.name },
    });
  });

  allocateFunds = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.user;
    const { agentId } = req.params; // Correctly get agentId from URL parameter
    const { amount } = req.body;

    if (!agentId || !amount || typeof amount !== 'number' || amount <= 0) {
      throw new BadRequestError('Agent ID and a positive amount are required.');
    }

    if (adminUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can allocate funds.');
    }

    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent') {
      throw new NotFoundError('Agent not found or user is not an agent.');
    }

    // Allocate funds to the agent's profile
    (agent.agentProfile = agent.agentProfile || { allocatedFunds: 0 }).allocatedFunds += amount; // Ensure agentProfile exists
    await agent.save();

    logger.info(`Admin ${adminUser._id} allocated ${amount} to agent ${agentId}`);

    res.status(200).json({
      success: true,
      message: `Successfully allocated ${amount} to agent ${agent.name}. New balance: ${agent.agentProfile.allocatedFunds}.`,
      data: { agentId: agent._id, allocatedFunds: agent.agentProfile.allocatedFunds },
    });
  });

  getWithdrawalRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.user;
    const { status } = req.query; // Optional: filter by status

    if (adminUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can view withdrawal requests.');
    }

    const filter: { status?: 'pending' | 'approved' | 'rejected' } = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      filter.status = status as 'pending' | 'approved' | 'rejected';
    }

    const withdrawalRequests = await Withdrawal.find(filter)
      .populate('userId', 'name email wallet.balance') // Populate user details
      .sort({ requestedAt: -1 });

    res.status(200).json({
      success: true,
      count: withdrawalRequests.length,
      data: withdrawalRequests,
    });
  });

  approveWithdrawalRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.user;
    const { withdrawalId } = req.params;

    if (adminUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can approve withdrawal requests.');
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundError('Withdrawal request not found.');
    }

    if (withdrawal.status !== 'pending') {
      throw new BadRequestError(`Withdrawal request is already ${withdrawal.status}.`);
    }

    withdrawal.status = 'approved';
    withdrawal.processedAt = new Date();
    withdrawal.adminId = adminUser._id;
    await withdrawal.save();

    // Send email notification to user
    const userForEmail = await User.findById(withdrawal.userId);
    if (userForEmail) {
      await emailService.sendWithdrawalStatusEmail(
        userForEmail.email,
        userForEmail.name || userForEmail.email, // Use email if name is not available
        withdrawal.amountNaira, 'approved'
      );
    }
    
    logger.info(`Admin ${adminUser._id} approved withdrawal request ${withdrawalId}`);

    res.status(200).json({
      success: true,
      message: 'Withdrawal request approved successfully.',
      data: withdrawal,
    });
  });

  rejectWithdrawalRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.user;
    const { withdrawalId } = req.params;

    if (adminUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can reject withdrawal requests.');
    }

    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) {
      throw new NotFoundError('Withdrawal request not found.');
    }

    if (withdrawal.status !== 'pending') {
      throw new BadRequestError(`Withdrawal request is already ${withdrawal.status}.`);
    }

    // Return points to user's wallet
    const user = await User.findById(withdrawal.userId);
    if (!user) { // If user is not found, log an error but proceed with rejection
      logger.error(`User not found for rejected withdrawal ${withdrawalId}. Could not return points.`);
      // Decide how to handle: either proceed with rejection without returning points, or throw an error.
      // For now, let's proceed with rejection, but log the issue.
    } else {
      (user.wallet = user.wallet || { balance: 0 }).balance += withdrawal.pointsRedeemed; // Ensure wallet exists
      await user.save();
      logger.info(`Points ${withdrawal.pointsRedeemed} returned to user ${user._id} for rejected withdrawal ${withdrawalId}`);
    }
    
    withdrawal.status = 'rejected';
    withdrawal.processedAt = new Date();
    withdrawal.adminId = adminUser._id;
    await withdrawal.save();
    
    // Send email notification to user
    const userForEmail = await User.findById(withdrawal.userId);
    if (userForEmail) {
      await emailService.sendWithdrawalStatusEmail(
        userForEmail.email,
        userForEmail.name || userForEmail.email, // Use email if name is not available
        withdrawal.amountNaira, 'rejected'
      );
    }

    logger.info(`Admin ${adminUser._id} rejected withdrawal request ${withdrawalId}`);

    res.status(200).json({
      success: true,
      message: 'Withdrawal request rejected.',
      data: withdrawal,
    });
  });

  getUsers = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const adminUser = req.user;
    const { role } = req.query; // Optional: filter by role

    if (adminUser.role !== 'admin') {
      throw new ForbiddenError('Only administrators can view users.');
    }

    const filter: { role?: string } = {};
    if (role && (['user', 'agent', 'admin'] as string[]).includes(role as string)) {
      filter.role = role as string;
    }

    // Populate agentProfile.manager to show which admin manages the agent
    const users = await User.find(filter)
      .select('-password -refreshToken') // Exclude sensitive fields
      .populate('agentProfile.manager', 'name email') // Populate manager details if agent
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  });
}

export default new AdminController();
