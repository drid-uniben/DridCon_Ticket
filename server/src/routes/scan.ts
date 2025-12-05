import { Router } from 'express';
import scanController from '../controllers/scan.controller';
import { authenticateAgentToken } from '../middleware/auth.middleware';

const router = Router();

// Route for agent to scan a user's QR code
router.post('/', authenticateAgentToken, scanController.scanQRCode);

// Route for agent to get their scan history
router.get('/history', authenticateAgentToken, scanController.getAgentScanHistory);

export default router;