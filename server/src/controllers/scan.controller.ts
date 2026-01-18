import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import User, { CheckInStatus, TicketType, UserRole } from '../model/user.model';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../utils/customErrors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';
import { verifyQRCode } from '../services/qr.service';

class ScanController {
  // server/src/controllers/scan.controller.ts - UPDATED VERSION

  scanQRCode = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const agent = req.user;
      const { qrCode } = req.body;

      if (agent?.role !== UserRole.AGENT) {
        throw new ForbiddenError('Only agents can scan QR codes.');
      }

      if (!qrCode) {
        throw new BadRequestError('QR code data is required.');
      }

      const decoded = verifyQRCode(qrCode);
      if (!decoded || !decoded.email) {
        throw new BadRequestError('Invalid or expired QR code.');
      }

      // Default to main-conference for backward compatibility
      const sessionType = decoded.sessionType || 'main-conference';

      const attendee = await User.findOne({ email: decoded.email }).populate(
        'checkedInBy preConferenceCheckedInBy mainConferenceCheckedInBy',
        'name'
      );

      if (!attendee) {
        throw new NotFoundError('Invalid QR code. Attendee not found.');
      }

      // NEW: Handle old tickets (users without new fields)
      const isLegacyTicket =
        !attendee.mainConferenceQrCode &&
        !attendee.preConferenceQrCode &&
        attendee.qrCode; // Has old qrCode field

      if (isLegacyTicket) {
        // Use old check-in logic for backward compatibility
        if (attendee.checkInStatus === CheckInStatus.CHECKED_IN) {
          throw new ConflictError('This ticket has already been used.', {
            attendeeName: attendee.name,
            checkedInBy: (attendee.checkedInBy as any)?.name,
            checkedInAt: attendee.checkedInAt?.toISOString(),
            sessionType: 'Main Conference (Jan 21)',
          });
        }

        attendee.checkInStatus = CheckInStatus.CHECKED_IN;
        attendee.checkedInAt = new Date();
        attendee.checkedInBy = agent._id as any;
        await attendee.save();

        logger.info(
          `Agent ${agent.email} checked in legacy ticket for attendee ${attendee.email}`
        );

        res.status(200).json({
          success: true,
          message: 'Check-in successful.',
          data: {
            name: attendee.name,
            email: attendee.email,
            ticketType: attendee.ticketType,
            sessionType: 'Main Conference (January 21)',
          },
        });
        return; // Exit early for legacy tickets
      }

      // Handle session-specific check-in for new tickets
      if (sessionType === 'pre-conference') {
        if (!attendee.preConferenceQrCode) {
          throw new BadRequestError(
            'This attendee does not have a pre-conference ticket.'
          );
        }

        if (attendee.preConferenceCheckInStatus === CheckInStatus.CHECKED_IN) {
          throw new ConflictError(
            'This pre-conference ticket has already been used.',
            {
              attendeeName: attendee.name,
              checkedInBy: (attendee.preConferenceCheckedInBy as any)?.name,
              checkedInAt: attendee.preConferenceCheckedInAt?.toISOString(),
              sessionType: 'Pre-Conference (Jan 20)',
            }
          );
        }

        attendee.preConferenceCheckInStatus = CheckInStatus.CHECKED_IN;
        attendee.preConferenceCheckedInAt = new Date();
        attendee.preConferenceCheckedInBy = agent._id as any;
        await attendee.save();

        logger.info(
          `Agent ${agent.email} checked in attendee ${attendee.email} for pre-conference`
        );

        res.status(200).json({
          success: true,
          message: 'Pre-conference check-in successful.',
          data: {
            name: attendee.name,
            email: attendee.email,
            ticketType: attendee.ticketType,
            sessionType: 'Pre-Conference (January 20)',
          },
        });
      } else {
        // Main conference check-in for new system
        const qrField =
          attendee.ticketType === TicketType.LECTURER_PREMIUM
            ? 'mainConferenceCheckInStatus'
            : 'checkInStatus';
        console.log('QR Field:', qrField);

        const checkedInField =
          attendee.ticketType === TicketType.LECTURER_PREMIUM
            ? attendee.mainConferenceCheckInStatus
            : attendee.checkInStatus;

        if (checkedInField === CheckInStatus.CHECKED_IN) {
          const checkedInBy =
            attendee.ticketType === TicketType.LECTURER_PREMIUM
              ? (attendee.mainConferenceCheckedInBy as any)?.name
              : (attendee.checkedInBy as any)?.name;

          const checkedInAt =
            attendee.ticketType === TicketType.LECTURER_PREMIUM
              ? attendee.mainConferenceCheckedInAt
              : attendee.checkedInAt;

          throw new ConflictError('This ticket has already been used.', {
            attendeeName: attendee.name,
            checkedInBy,
            checkedInAt: checkedInAt?.toISOString(),
            sessionType: 'Main Conference (Jan 21)',
          });
        }

        if (attendee.ticketType === TicketType.LECTURER_PREMIUM) {
          attendee.mainConferenceCheckInStatus = CheckInStatus.CHECKED_IN;
          attendee.mainConferenceCheckedInAt = new Date();
          attendee.mainConferenceCheckedInBy = agent._id as any;
        } else {
          attendee.checkInStatus = CheckInStatus.CHECKED_IN;
          attendee.checkedInAt = new Date();
          attendee.checkedInBy = agent._id as any;
        }

        await attendee.save();

        logger.info(
          `Agent ${agent.email} checked in attendee ${attendee.email} for main conference`
        );

        res.status(200).json({
          success: true,
          message: 'Check-in successful.',
          data: {
            name: attendee.name,
            email: attendee.email,
            ticketType: attendee.ticketType,
            sessionType: 'Main Conference (January 21)',
          },
        });
      }
    }
  );

  getAgentScanHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const agent = req.user;

      if (agent?.role !== UserRole.AGENT) {
        throw new ForbiddenError('Only agents can view their scan history.');
      }

      // Find all users that this agent has checked in, in any capacity
      const usersCheckedInByAgent = await User.find({
        $or: [
          { checkedInBy: agent._id },
          { preConferenceCheckedInBy: agent._id },
          { mainConferenceCheckedInBy: agent._id },
        ],
      })
        .populate('checkedInBy preConferenceCheckedInBy mainConferenceCheckedInBy', 'name')
        .sort({ 'updatedAt': -1 });

      const history: any[] = [];

      // Process each user to create specific history entries for each relevant check-in
      usersCheckedInByAgent.forEach(user => {
        // Check for standard/legacy check-in
        if (user.checkedInBy && user.checkedInBy.toString() === agent._id.toString()) {
          history.push({
            _id: `${user._id}-main-legacy`,
            name: user.name,
            email: user.email,
            ticketType: user.ticketType,
            checkedInAt: user.checkedInAt,
            checkInStatus: user.checkInStatus,
            checkedInBy: user.checkedInBy,
            sessionType: 'Main Conference',
          });
        }
        
        // Check for pre-conference check-in
        if (user.preConferenceCheckedInBy && user.preConferenceCheckedInBy.toString() === agent._id.toString()) {
          history.push({
            _id: `${user._id}-preconf`,
            name: user.name,
            email: user.email,
            ticketType: user.ticketType,
            checkedInAt: user.preConferenceCheckedInAt,
            checkInStatus: user.preConferenceCheckInStatus,
            checkedInBy: user.preConferenceCheckedInBy,
            sessionType: 'Pre-Conference',
          });
        }

        // Check for main conference check-in (for premium tickets)
        if (user.mainConferenceCheckedInBy && user.mainConferenceCheckedInBy.toString() === agent._id.toString()) {
          // Avoid duplicating the standard check-in if it's the same event
          if (!user.checkedInBy || user.checkedInBy.toString() !== agent._id.toString()) {
            history.push({
              _id: `${user._id}-main-premium`,
              name: user.name,
              email: user.email,
              ticketType: user.ticketType,
              checkedInAt: user.mainConferenceCheckedInAt,
              checkInStatus: user.mainConferenceCheckInStatus,
              checkedInBy: user.mainConferenceCheckedInBy,
              sessionType: 'Main Conference',
            });
          }
        }
      });
      
      // Sort the combined history by check-in time, descending
      history.sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime());

      const totalScans = history.length;
      const successfulCheckIns = history.filter(
        (item) => item.checkInStatus === CheckInStatus.CHECKED_IN
      ).length;

      res.status(200).json({
        success: true,
        data: {
          history,
          stats: {
            totalScans,
            successfulCheckIns,
          },
        },
      });
    }
  );
}

export default new ScanController();
