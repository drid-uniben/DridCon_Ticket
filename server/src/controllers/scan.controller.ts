import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import User, { CheckInStatus, UserRole } from '../model/user.model';
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
  scanQRCode = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const agent = req.user;
      const { qrCode } = req.body; // This is the JWT from the QR code

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

      const attendee = await User.findOne({ email: decoded.email }).populate(
        'checkedInBy',
        'name'
      );

      if (!attendee) {
        throw new NotFoundError('Invalid QR code. Attendee not found.');
      }

      if (attendee.checkInStatus === CheckInStatus.CHECKED_IN) {
        logger.warn(
          `Attempt to re-scan already checked-in attendee: ${attendee.email}`
        );
        throw new ConflictError('This ticket has already been used.', {
          checkedInBy: (attendee.checkedInBy as any)?.name,
          checkedInAt: attendee.checkedInAt?.toLocaleString(),
        });
      }

      attendee.checkInStatus = CheckInStatus.CHECKED_IN;
      attendee.checkedInAt = new Date();
      attendee.checkedInBy = agent._id as any;
      await attendee.save();

      logger.info(
        `Agent ${agent.email} successfully checked in attendee ${attendee.email}`
      );

      res.status(200).json({
        success: true,
        message: 'Check-in successful.',
        data: {
          name: attendee.name,
          email: attendee.email,
          ticketType: attendee.ticketType,
        },
      });
    }
  );

  getAgentScanHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const agent = req.user;

      if (agent?.role !== UserRole.AGENT) {
        throw new ForbiddenError('Only agents can view their scan history.');
      }

      const history = await User.find({
        checkedInBy: agent._id as any,
        checkInStatus: CheckInStatus.CHECKED_IN,
      })
        .select('_id name email ticketType checkedInAt checkInStatus checkedInBy')
        .populate('checkedInBy', 'name')
        .sort({ checkedInAt: -1 });

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

