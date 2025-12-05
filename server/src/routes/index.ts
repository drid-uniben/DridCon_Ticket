import { Router } from 'express';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import redeemRoutes from './redeem';
import scanRoutes from './scan';
import agentRoutes from './agent.routes';

const router = Router();

// Mount route groups
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/redeem', redeemRoutes);
router.use('/scan', scanRoutes);
router.use('/agent', agentRoutes);

// Root route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EcoUNIBEN Waste Recycling Backend API is running',
  });
});

export default router;
