import { Router } from 'express';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import scanRoutes from './scan';

const router = Router();

// Mount route groups
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/scan', scanRoutes);

// Root route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DridCon Ticket Management System Backend API is running',
  });
});

export default router;
