import express from 'express';
import adminController from '../controllers/admin.controller';
import scanLogController from '../controllers/scanLog.controller';
import {
  authenticateAdminToken,
  rateLimiter,
} from '../middleware/auth.middleware';

const router = express.Router();

const adminRateLimiter = rateLimiter(2000, 60 * 60 * 1000);

router.use(authenticateAdminToken);
router.use(adminRateLimiter);

// Agent Management
router.post('/agents', adminController.createAgent);
router.get('/agents', adminController.getAgents);

// Attendee Management
router.post('/attendees/manual', adminController.manualRegisterAttendee);
router.post('/attendees/invite', adminController.inviteAttendee);
router.get('/attendees/pending', adminController.reviewSelfRegisteredAttendees);
router.post(
  '/attendees/:attendeeId/approve',
  adminController.approveRegistration
);
router.post(
  '/attendees/:attendeeId/decline',
  adminController.declineRegistration
);
router.get('/attendees', adminController.getAllAttendees);

// Dashboard
router.get('/dashboard', adminController.getDashboardData);

router.get(
  '/attendees/researcher-premium',
  adminController.getResearcherPremiumAttendees
);
router.post(
  '/attendees/send-preconf-invite',
  adminController.sendPreConferenceInvite
);
router.post(
  '/attendees/quick-with-tickets',
  adminController.quickRegisterWithTickets
);

// Manual check-in for existing attendees
router.post(
  '/attendees/pre-conference/manual-check-in',
  adminController.manualCheckInPreConference
);
router.post(
  '/attendees/main-conference/manual-check-in',
  adminController.manualCheckInMainConference
);

router.post('/attendees/instant-checkin', adminController.instantCheckIn);

// Scan logs (admin)
router.get('/agents/:agentId/scan-history', scanLogController.getActorScanHistoryForAdmin);

export default router;
