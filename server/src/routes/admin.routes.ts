import express from 'express';
import adminController from '../controllers/admin.controller';
import {
  authenticateAdminToken,
  rateLimiter,
} from '../middleware/auth.middleware';

const router = express.Router();

const adminRateLimiter = rateLimiter(2000, 60 * 60 * 1000); // Keep rate limiter for admin routes

router.use(authenticateAdminToken);
router.use(adminRateLimiter);

// User Management Routes
router.get('/users', adminController.getUsers); // New route for getting all users

// Agent Management Routes
router.post('/agents/invite', adminController.inviteAgent);
router.post('/agents/:agentId/allocate-funds', adminController.allocateFunds);

// Withdrawal Management Routes
router.get('/withdrawals', adminController.getWithdrawalRequests);
router.post('/withdrawals/:withdrawalId/approve', adminController.approveWithdrawalRequest);
router.post('/withdrawals/:withdrawalId/reject', adminController.rejectWithdrawalRequest);

export default router;
