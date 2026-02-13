/* eslint-disable max-lines */
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
import {
  getAgentScanHistoryData,
  getLatestSuccessfulCheckInSourcesForAttendees,
  recordScanAttempt,
} from '../services/scanHistory.service';

class ScanController {
  private processQRCodeCheckIn = async (
    req: AuthenticatedRequest,
    res: Response,
    forcedSessionType?: 'pre-conference' | 'main-conference'
  ) => {
    const agent = req.user;
    const { qrCode } = req.body;

    let sessionTypeForLog: 'pre-conference' | 'main-conference' | undefined = forcedSessionType;
    let attendeeForLog: any = undefined;

    try {
      if (agent?.role !== UserRole.AGENT) {
        throw new ForbiddenError('Only agents can check in attendees.');
      }

      if (!qrCode) {
        throw new BadRequestError('QR code data is required.');
      }

      const decoded = verifyQRCode(qrCode);
      if (!decoded || !decoded.email) {
        throw new BadRequestError('Invalid or expired QR code.');
      }

      const decodedSessionType: 'pre-conference' | 'main-conference' =
        decoded.sessionType || 'main-conference';

      if (forcedSessionType && decodedSessionType !== forcedSessionType) {
        sessionTypeForLog = decodedSessionType;
        throw new BadRequestError(
          `This QR code is for ${decodedSessionType.replace('-', ' ')}. Please scan the correct ticket.`
        );
      }

      const sessionType = forcedSessionType || decodedSessionType;
      sessionTypeForLog = sessionType;

      const attendee = await User.findOne({ email: decoded.email }).populate(
        'checkedInBy preConferenceCheckedInBy mainConferenceCheckedInBy',
        'name'
      );
      attendeeForLog = attendee;

      if (!attendee) {
        throw new NotFoundError('Invalid QR code. Attendee not found.');
      }

      const isLegacyTicket =
        !attendee.mainConferenceQrCode &&
        !attendee.preConferenceQrCode &&
        attendee.qrCode;

      if (isLegacyTicket) {
        if (sessionType === 'pre-conference') {
          throw new BadRequestError(
            'This attendee does not have a pre-conference ticket.'
          );
        }

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

        await recordScanAttempt({
          agentId: agent._id,
          scanSource: 'qr',
          scanStatus: 'success',
          sessionType: sessionTypeForLog,
          attendee,
          message: 'Check-in successful.',
          qrCode,
        });

        logger.info(`Agent ${agent.email} checked in legacy ticket for attendee ${attendee.email}`);

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
        return;
      }

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

        await recordScanAttempt({
          agentId: agent._id,
          scanSource: 'qr',
          scanStatus: 'success',
          sessionType: sessionTypeForLog,
          attendee,
          message: 'Pre-conference check-in successful.',
          qrCode,
        });

        logger.info(`Agent ${agent.email} checked in attendee ${attendee.email} for pre-conference`);

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
        return;
      }

      const checkedInField = attendee.ticketType === TicketType.LECTURER_PREMIUM ? attendee.mainConferenceCheckInStatus : attendee.checkInStatus;

      if (checkedInField === CheckInStatus.CHECKED_IN) {
        const checkedInBy = attendee.ticketType === TicketType.LECTURER_PREMIUM ? (attendee.mainConferenceCheckedInBy as any)?.name : (attendee.checkedInBy as any)?.name;

        const checkedInAt = attendee.ticketType === TicketType.LECTURER_PREMIUM ? attendee.mainConferenceCheckedInAt : attendee.checkedInAt;

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

      await recordScanAttempt({
        agentId: agent._id,
        scanSource: 'qr',
        scanStatus: 'success',
        sessionType: sessionTypeForLog,
        attendee,
        message: 'Check-in successful.',
        qrCode,
      });

      logger.info(`Agent ${agent.email} checked in attendee ${attendee.email} for main conference`);

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
    } catch (err: any) {
      const statusCode = err?.statusCode;
      const scanStatus = statusCode === 409 ? 'already_scanned' : 'invalid';
      await recordScanAttempt({
        agentId: agent?._id,
        scanSource: 'qr',
        scanStatus,
        sessionType: sessionTypeForLog,
        attendee: attendeeForLog,
        message: err?.message,
        details: err?.details,
        qrCode,
      });
      throw err;
    }
  };

  private processManualCheckIn = async (
    req: AuthenticatedRequest,
    res: Response,
    sessionType: 'pre-conference' | 'main-conference'
  ) => {
    const agent = req.user;
    const { attendeeId } = req.body as { attendeeId?: string };

    let attendeeForLog: any = undefined;

    try {
      if (agent?.role !== UserRole.AGENT) {
        throw new ForbiddenError('Only agents can check in attendees.');
      }

      if (!attendeeId) {
        throw new BadRequestError('attendeeId is required.');
      }

      const attendee = await User.findById(attendeeId).populate(
        'checkedInBy preConferenceCheckedInBy mainConferenceCheckedInBy',
        'name'
      );
      attendeeForLog = attendee;

      if (!attendee) {
        throw new NotFoundError('Attendee not found.');
      }

      if (attendee.role !== UserRole.USER) {
        throw new BadRequestError('Only attendees can be checked in.');
      }

      const isLegacyTicket =
        !attendee.mainConferenceQrCode &&
        !attendee.preConferenceQrCode &&
        attendee.qrCode;

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

        await recordScanAttempt({
          agentId: agent._id,
          scanSource: 'manual',
          scanStatus: 'success',
          sessionType: 'pre-conference',
          attendee,
          message: 'Pre-conference check-in successful.',
        });

        logger.info(`Agent ${agent.email} manually checked in attendee ${attendee.email} for pre-conference`);

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
        return;
      }

      // Main conference manual check-in
      if (isLegacyTicket) {
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

        await recordScanAttempt({
          agentId: agent._id,
          scanSource: 'manual',
          scanStatus: 'success',
          sessionType: 'main-conference',
          attendee,
          message: 'Check-in successful.',
        });

        logger.info(`Agent ${agent.email} manually checked in legacy ticket for attendee ${attendee.email}`);

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
        return;
      }

      const checkedInField = attendee.ticketType === TicketType.LECTURER_PREMIUM ? attendee.mainConferenceCheckInStatus : attendee.checkInStatus;
      if (checkedInField === CheckInStatus.CHECKED_IN) {
        const checkedInBy = attendee.ticketType === TicketType.LECTURER_PREMIUM ? (attendee.mainConferenceCheckedInBy as any)?.name : (attendee.checkedInBy as any)?.name;
        const checkedInAt = attendee.ticketType === TicketType.LECTURER_PREMIUM ? attendee.mainConferenceCheckedInAt : attendee.checkedInAt;

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

      await recordScanAttempt({
        agentId: agent._id,
        scanSource: 'manual',
        scanStatus: 'success',
        sessionType: 'main-conference',
        attendee,
        message: 'Check-in successful.',
      });

      logger.info(`Agent ${agent.email} manually checked in attendee ${attendee.email} for main conference`);

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
    } catch (err: any) {
      const statusCode = err?.statusCode;
      const scanStatus = statusCode === 409 ? 'already_scanned' : 'invalid';
      await recordScanAttempt({
        agentId: agent?._id,
        scanSource: 'manual',
        scanStatus,
        sessionType,
        attendee: attendeeForLog,
        message: err?.message,
        details: err?.details,
      });
      throw err;
    }
  };

  scanQRCode = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await this.processQRCodeCheckIn(req, res);
  });

  checkInPreConference = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      await this.processQRCodeCheckIn(req, res, 'pre-conference');
    }
  );

  checkInMainConference = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      await this.processQRCodeCheckIn(req, res, 'main-conference');
    }
  );

  manualCheckInPreConference = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      await this.processManualCheckIn(req, res, 'pre-conference');
    }
  );

  manualCheckInMainConference = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      await this.processManualCheckIn(req, res, 'main-conference');
    }
  );

  getAttendeesForAgent = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const agent = req.user;

      if (agent?.role !== UserRole.AGENT) {
        throw new ForbiddenError('Only agents can view attendees.');
      }

      const attendees = await User.find({ role: UserRole.USER })
        .select(
          [
            'name',
            'email',
            'ticketType',
            'qrCode',
            'preConferenceQrCode',
            'mainConferenceQrCode',
            'checkInStatus',
            'checkedInAt',
            'preConferenceCheckInStatus',
            'preConferenceCheckedInAt',
            'mainConferenceCheckInStatus',
            'mainConferenceCheckedInAt',
          ].join(' ')
        )
        .sort({ createdAt: -1 });

      const attendeeIds = attendees.map((a) => a._id);
      const sourcesMap = await getLatestSuccessfulCheckInSourcesForAttendees(attendeeIds);

      const enriched = attendees.map((a) => {
        const obj = a.toObject();
        const id = a._id.toString();
        const pre = sourcesMap.get(`${id}:pre-conference`);
        const main = sourcesMap.get(`${id}:main-conference`);

        return {
          ...obj,
          preConferenceCheckInSource: pre?.scanSource,
          mainConferenceCheckInSource: main?.scanSource,
        };
      });

      res.status(200).json({
        success: true,
        data: enriched,
      });
    }
  );

  getAgentScanHistory = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const agent = req.user;

      if (agent?.role !== UserRole.AGENT) {
        throw new ForbiddenError('Only agents can view their scan history.');
      }

      const data = await getAgentScanHistoryData(agent._id);

      res.status(200).json({
        success: true,
        data,
      });
    }
  );
}

export default new ScanController();
