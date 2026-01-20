import { Router } from 'express';
import scanController from '../controllers/scan.controller';
import { authenticateAgentToken } from '../middleware/auth.middleware';

const router = Router();

// Route for agent to scan a user's QR code
router.post('/', authenticateAgentToken, scanController.scanQRCode);

// Dedicated check-in endpoints (explicit session type)
router.post(
  '/pre-conference/check-in',
  authenticateAgentToken,
  scanController.checkInPreConference
);
router.post(
  '/main-conference/check-in',
  authenticateAgentToken,
  scanController.checkInMainConference
);

// Manual check-in endpoints (no QR scan)
router.post(
  '/pre-conference/manual-check-in',
  authenticateAgentToken,
  scanController.manualCheckInPreConference
);
router.post(
  '/main-conference/manual-check-in',
  authenticateAgentToken,
  scanController.manualCheckInMainConference
);

// List attendees for the agent dashboard
router.get('/attendees', authenticateAgentToken, scanController.getAttendeesForAgent);

// Route for agent to get their scan history
router.get('/history', authenticateAgentToken, scanController.getAgentScanHistory);

export default router;