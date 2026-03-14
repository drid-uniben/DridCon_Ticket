/* eslint-disable max-lines */
import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import logger from '../utils/logger';
import User, {
  PaymentStatus,
  UserRole,
  CheckInStatus,
  TicketType,
} from '../model/user.model';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/customErrors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  recordScanAttempt,
  getLatestSuccessfulCheckInSourcesForAttendees,
} from '../services/scanHistory.service';
import passwordGenerator from '../utils/passwordGenerator';
import emailService from '../services/email.service';
import { generateQRCode } from '../services/qr.service';
import crypto from 'crypto';

class AdminController {
  createAgent = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { name, email } = req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can create agents.');
      }

      if (!name || !email) {
        throw new BadRequestError('Email and name are required.');
      }

      let agent = await User.findOne({ email });
      if (agent) {
        throw new BadRequestError('An agent with this email already exists.');
      }

      const generatedPassword = passwordGenerator(12);

      agent = await User.create({
        name,
        email,
        password: generatedPassword,
        role: UserRole.AGENT,
        isActive: true,
      });

      await emailService.sendAgentCredentials(agent.email, generatedPassword);

      logger.info(
        `Admin ${req.user._id} created new agent: ${agent._id} (${agent.email})`
      );

      res.status(201).json({
        success: true,
        message: `Agent ${name} (${email}) created successfully and credentials sent.`,
        data: {
          agentId: agent._id,
          email: agent.email,
          name: agent.name,
        },
      });
    }
  );

  getAgents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    if (req.user?.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can view agents.');
    }

    const agents = await User.find({ role: UserRole.AGENT }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents,
    });
  });

  manualRegisterAttendee = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const {
        name,
        email,
        phoneNumber,
        ticketType,
        designation,
        department,
        wantsPreConference,
      } = req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError(
          'Only administrators can manually register attendees.'
        );
      }

      if (!name || !email || !phoneNumber || !ticketType) {
        throw new BadRequestError(
          'Name, email, phone number, and ticket type are required.'
        );
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new BadRequestError(
          'An attendee with this email already exists.'
        );
      }

      const isLecturerPremium = ticketType === TicketType.LECTURER_PREMIUM;
      const isResearcherPremiumWithPreConference =
        ticketType === TicketType.RESEARCHER_PREMIUM &&
        wantsPreConference === true;

      const attendee = await User.create({
        name,
        email,
        phoneNumber,
        ticketType,
        designation,
        department,
        wantsPreConference:
          ticketType === TicketType.RESEARCHER_PREMIUM
            ? wantsPreConference
            : undefined,
        preConferenceDeclinedDuringReg:
          ticketType === TicketType.RESEARCHER_PREMIUM && !wantsPreConference,
        paymentStatus: PaymentStatus.CONFIRMED,
        role: UserRole.USER,
        checkInStatus: CheckInStatus.NOT_CHECKED_IN,
        ticketsent: true,
      });

      if (isLecturerPremium || isResearcherPremiumWithPreConference) {
        const preConf = await generateQRCode({ email }, 'pre-conference');
        attendee.preConferenceQrCode = preConf.token;

        const preConfUrl = `${process.env.API_URL}${preConf.filePath}`;
        await emailService.sendPreConferenceTicket(
          email,
          name,
          preConfUrl,
          ticketType
        );

        const mainConf = await generateQRCode({ email }, 'main-conference');
        attendee.mainConferenceQrCode = mainConf.token;

        const mainConfUrl = `${process.env.API_URL}${mainConf.filePath}`;
        await emailService.sendTicketWithQR(
          email,
          name,
          mainConfUrl,
          ticketType
        );

        await attendee.save();
      } else {
        const { token, filePath } = await generateQRCode({ email });
        attendee.qrCode = token;
        await attendee.save();

        const qrCodeUrl = `${process.env.API_URL}${filePath}`;
        await emailService.sendTicketWithQR(email, name, qrCodeUrl, ticketType);
      }

      res.status(201).json({
        success: true,
        message: 'Attendee registered successfully.',
        data: attendee,
      });
    }
  );

  inviteAttendee = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { email, name, phoneNumber, ticketType, designation, department } =
        req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can invite attendees.');
      }

      if (!email) {
        throw new BadRequestError('Email is required.');
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new BadRequestError('A user with this email already exists.');
      }

      const inviteToken = crypto.randomBytes(32).toString('hex');
      const inviteTokenExpires = new Date(Date.now() + 3600000 * 24); // 24 hours

      await User.create({
        email,
        name,
        phoneNumber,
        ticketType,
        designation,
        department,
        inviteToken,
        inviteTokenExpires,
        role: UserRole.USER,
        isActive: false,
      });

      await emailService.sendAttendeeInvite(email, inviteToken);

      res.status(200).json({
        success: true,
        message: 'Attendee invitation sent successfully.',
      });
    }
  );

  reviewSelfRegisteredAttendees = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can view these records.');
      }

      const pendingAttendees = await User.find({
        paymentStatus: PaymentStatus.PENDING,
        role: UserRole.USER,
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: pendingAttendees.length,
        data: pendingAttendees,
      });
    }
  );

  approveRegistration = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { attendeeId } = req.params;
      const { ticketType, sessionType } = req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError(
          'Only administrators can approve registrations.'
        );
      }

      const attendee = await User.findById(attendeeId);
      if (!attendee) {
        throw new NotFoundError('Attendee not found.');
      }

      if (attendee.paymentStatus !== PaymentStatus.PENDING) {
        throw new BadRequestError('This registration is not pending approval.');
      }

      if (ticketType) {
        attendee.ticketType = ticketType;
      }

      const isLecturerPremium =
        attendee.ticketType === TicketType.LECTURER_PREMIUM;
      const isResearcherPremiumWithPreConference =
        attendee.ticketType === TicketType.RESEARCHER_PREMIUM &&
        attendee.wantsPreConference === true;

      if (isLecturerPremium || isResearcherPremiumWithPreConference) {
        if (sessionType === 'pre-conference') {
          const { token, filePath } = await generateQRCode(
            { email: attendee.email },
            'pre-conference'
          );

          attendee.preConferenceQrCode = token;
          await attendee.save();

          const qrCodeUrl = `${process.env.API_URL}${filePath}`;
          if (attendee.ticketType !== undefined) {
            await emailService.sendPreConferenceTicket(
              attendee.email,
              attendee.name,
              qrCodeUrl,
              attendee.ticketType
            );
          }

          res.status(200).json({
            success: true,
            message: 'Pre-conference ticket approved and sent.',
            data: attendee,
          });
        } else if (sessionType === 'main-conference') {
          const { token, filePath } = await generateQRCode(
            { email: attendee.email },
            'main-conference'
          );

          attendee.mainConferenceQrCode = token;
          attendee.paymentStatus = PaymentStatus.CONFIRMED;
          await attendee.save();

          const qrCodeUrl = `${process.env.API_URL}${filePath}`;
          if (attendee.ticketType !== undefined) {
            await emailService.sendTicketWithQR(
              attendee.email,
              attendee.name,
              qrCodeUrl,
              attendee.ticketType
            );
          }

          attendee.ticketsent = true;
          await attendee.save();

          res.status(200).json({
            success: true,
            message: 'Main conference ticket approved and sent.',
            data: attendee,
          });
        } else {
          throw new BadRequestError(
            'Session type must be specified for tickets requiring separate sessions.'
          );
        }
      } else {
        const { token, filePath } = await generateQRCode({
          email: attendee.email,
        });

        attendee.paymentStatus = PaymentStatus.CONFIRMED;
        attendee.qrCode = token;
        await attendee.save();

        if (!attendee.ticketType) {
          throw new BadRequestError('Attendee does not have a ticket type.');
        }

        const qrCodeUrl = `${process.env.API_URL}${filePath}`;
        await emailService.sendTicketWithQR(
          attendee.email,
          attendee.name,
          qrCodeUrl,
          attendee.ticketType
        );

        attendee.ticketsent = true;
        await attendee.save();

        res.status(200).json({
          success: true,
          message: 'Registration approved successfully.',
          data: attendee,
        });
      }
    }
  );

  getResearcherPremiumAttendees = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can view this data.');
      }

      const attendees = await User.find({
        role: UserRole.USER,
        ticketType: TicketType.RESEARCHER_PREMIUM,
        paymentStatus: PaymentStatus.CONFIRMED,
      }).sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        count: attendees.length,
        data: attendees,
      });
    }
  );

  sendPreConferenceInvite = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { attendeeId } = req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can send invites.');
      }

      const attendee = await User.findById(attendeeId);
      if (!attendee) {
        throw new NotFoundError('Attendee not found.');
      }

      if (attendee.ticketType !== TicketType.RESEARCHER_PREMIUM) {
        throw new BadRequestError(
          'Only Researcher Premium attendees can receive pre-conference invites.'
        );
      }

      if (attendee.preConferenceDeclinedDuringReg) {
        throw new BadRequestError(
          'This attendee declined pre-conference during registration.'
        );
      }

      if (attendee.preConferenceQrCode) {
        throw new BadRequestError(
          'This attendee already has a pre-conference ticket.'
        );
      }

      const inviteToken = crypto.randomBytes(32).toString('hex');

      attendee.preConferenceInviteSent = true;
      attendee.preConferenceInviteResponse = 'pending';
      attendee.inviteToken = inviteToken;
      attendee.inviteTokenExpires = new Date(Date.now() + 3600000 * 24 * 7); // 7 days
      await attendee.save();

      await emailService.sendPreConferenceInvite(
        attendee.email,
        attendee.name,
        inviteToken
      );

      res.status(200).json({
        success: true,
        message: 'Pre-conference invite sent successfully.',
      });
    }
  );

  declineRegistration = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { attendeeId } = req.params;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError(
          'Only administrators can decline registrations.'
        );
      }

      const attendee = await User.findById(attendeeId);
      if (!attendee) {
        throw new NotFoundError('Attendee not found.');
      }

      attendee.paymentStatus = PaymentStatus.DECLINED;
      await attendee.save();

      await emailService.sendDeclineRegistrationEmail(
        attendee.email,
        attendee.name
      );

      res.status(200).json({
        success: true,
        message: 'Registration declined successfully.',
      });
    }
  );

  getAllAttendees = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can view all attendees.');
      }

      // ── Parse query params ────────────────────────────────────────────────
      const {
        search = '',
        status = 'all',
        checkIn = 'all',
        checkInSession = 'any',
        page: pageRaw = '1',
        pageSize: pageSizeRaw = '50',
      } = req.query as Record<string, string>;

      const page = Math.max(1, parseInt(pageRaw, 10) || 1);
      const pageSize = Math.min(
        200,
        Math.max(1, parseInt(pageSizeRaw, 10) || 50)
      );
      const skip = (page - 1) * pageSize;

      // ── Build filter ──────────────────────────────────────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filter: Record<string, any> = { role: UserRole.USER };

      // 1. Text search on name or email
      if (search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        filter.$or = [{ name: regex }, { email: regex }];
      }

      // 2. Payment status
      if (status !== 'all') {
        // Validate against known values to prevent injection
        const allowed: string[] = [
          PaymentStatus.PENDING,
          PaymentStatus.CONFIRMED,
          PaymentStatus.DECLINED,
        ];
        if (allowed.includes(status)) {
          filter.paymentStatus = status;
        }
      }

      // 3. Check-in status
      if (checkIn !== 'all') {
        const isCheckedIn = checkIn === 'checked-in';
        const checkedInValue = isCheckedIn
          ? CheckInStatus.CHECKED_IN
          : CheckInStatus.NOT_CHECKED_IN;
        const notCheckedInValue = CheckInStatus.NOT_CHECKED_IN;

        if (checkInSession === 'pre-conference') {
          filter.preConferenceCheckInStatus = checkedInValue;
        } else if (checkInSession === 'main-conference') {
          if (isCheckedIn) {
            // Either the session-specific field OR the legacy field is checked in
            filter.$or = [
              ...(filter.$or ?? []),
              { mainConferenceCheckInStatus: CheckInStatus.CHECKED_IN },
              { checkInStatus: CheckInStatus.CHECKED_IN },
            ];
          } else {
            filter.mainConferenceCheckInStatus = {
              $ne: CheckInStatus.CHECKED_IN,
            };
            filter.checkInStatus = { $ne: CheckInStatus.CHECKED_IN };
          }
        } else {
          // "any" session
          if (isCheckedIn) {
            filter.$or = [
              ...(filter.$or ?? []),
              { checkInStatus: CheckInStatus.CHECKED_IN },
              { preConferenceCheckInStatus: CheckInStatus.CHECKED_IN },
              { mainConferenceCheckInStatus: CheckInStatus.CHECKED_IN },
            ];
          } else {
            filter.checkInStatus = { $ne: CheckInStatus.CHECKED_IN };
            filter.preConferenceCheckInStatus = {
              $ne: CheckInStatus.CHECKED_IN,
            };
            filter.mainConferenceCheckInStatus = {
              $ne: CheckInStatus.CHECKED_IN,
            };
          }
        }
      }

      // ── Query ─────────────────────────────────────────────────────────────
      const [attendees, total] = await Promise.all([
        User.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(pageSize)
          .lean(),
        User.countDocuments(filter),
      ]);

      // ── Enrich with check-in sources from scan history ────────────────────
      const attendeeIds = attendees.map((a) => a._id);
      const sourcesMap =
        await getLatestSuccessfulCheckInSourcesForAttendees(attendeeIds);

      const enriched = attendees.map((a) => {
        const id = a._id.toString();
        const pre = sourcesMap.get(`${id}:pre-conference`);
        const main = sourcesMap.get(`${id}:main-conference`);
        return {
          ...a,
          preConferenceCheckInSource: pre?.scanSource,
          mainConferenceCheckInSource: main?.scanSource,
        };
      });

      // ── Response ──────────────────────────────────────────────────────────
      res.status(200).json({
        success: true,
        data: enriched,
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      });
    }
  );

  getDashboardData = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError(
          'Only administrators can view dashboard data.'
        );
      }

      const totalAttendeesCount = await User.countDocuments({
        role: UserRole.USER,
      });
      const checkedInAttendeesCount = await User.countDocuments({
        role: UserRole.USER,
        checkInStatus: 'checked-in',
      });
      const totalAgentsCount = await User.countDocuments({
        role: UserRole.AGENT,
      });
      const pendingApprovalsCount = await User.countDocuments({
        role: UserRole.USER,
        paymentStatus: PaymentStatus.PENDING,
      });

      res.status(200).json({
        success: true,
        data: {
          totalAttendeesCount,
          checkedInAttendeesCount,
          totalAgentsCount,
          pendingApprovalsCount,
        },
      });
    }
  );

  quickRegisterWithTickets = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { name, email, ticketType, sendBothTickets } = req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError(
          'Only administrators can use quick registration.'
        );
      }

      if (!email || !ticketType) {
        throw new BadRequestError('Email and ticket type are required.');
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new BadRequestError(
          'An attendee with this email already exists.'
        );
      }

      const attendee = await User.create({
        name: name || 'Quick Registration',
        email,
        phoneNumber: 'N/A',
        ticketType,
        designation: 'Walk-in',
        department: 'N/A',
        paymentStatus: PaymentStatus.CONFIRMED,
        role: UserRole.USER,
        checkInStatus: CheckInStatus.NOT_CHECKED_IN,
        ticketsent: true,
      });

      const isLecturerPremium = ticketType === TicketType.LECTURER_PREMIUM;
      const needsBothTickets =
        isLecturerPremium ||
        (ticketType === TicketType.RESEARCHER_PREMIUM && sendBothTickets);

      if (needsBothTickets) {
        const preConf = await generateQRCode({ email }, 'pre-conference');
        attendee.preConferenceQrCode = preConf.token;
        const preConfUrl = `${process.env.API_URL}${preConf.filePath}`;
        await emailService.sendPreConferenceTicket(
          email,
          'Attendee',
          preConfUrl,
          ticketType
        );

        const mainConf = await generateQRCode({ email }, 'main-conference');
        attendee.mainConferenceQrCode = mainConf.token;
        const mainConfUrl = `${process.env.API_URL}${mainConf.filePath}`;
        await emailService.sendTicketWithQR(
          email,
          'Attendee',
          mainConfUrl,
          ticketType
        );

        await attendee.save();
      } else {
        const { token, filePath } = await generateQRCode({ email });
        attendee.qrCode = token;
        await attendee.save();

        const qrCodeUrl = `${process.env.API_URL}${filePath}`;
        await emailService.sendTicketWithQR(
          email,
          'Attendee',
          qrCodeUrl,
          ticketType
        );
      }

      res.status(201).json({
        success: true,
        message: 'Quick registration completed and tickets sent.',
        data: attendee,
      });
    }
  );

  instantCheckIn = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { name, email, ticketType, sessionType } = req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError(
          'Only administrators can use instant check-in.'
        );
      }

      if (!email || !ticketType) {
        throw new BadRequestError('Email and ticket type are required.');
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new BadRequestError(
          'An attendee with this email already exists.'
        );
      }

      const isLecturerPremium = ticketType === TicketType.LECTURER_PREMIUM;
      const isResearcherPremium = ticketType === TicketType.RESEARCHER_PREMIUM;

      const effectiveSessionType =
        isLecturerPremium || isResearcherPremium
          ? sessionType
          : 'main-conference';

      if ((isLecturerPremium || isResearcherPremium) && !effectiveSessionType) {
        throw new BadRequestError(
          'Session type is required for premium ticket types.'
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const attendeeData: any = {
        name: name || 'Instant Check-in',
        email,
        phoneNumber: 'N/A',
        ticketType,
        designation: 'Walk-in',
        department: 'N/A',
        paymentStatus: PaymentStatus.CONFIRMED,
        role: UserRole.USER,
        ticketsent: false,
        checkInStatus: CheckInStatus.NOT_CHECKED_IN,
      };

      if (effectiveSessionType === 'pre-conference') {
        attendeeData.preConferenceCheckInStatus = CheckInStatus.CHECKED_IN;
        attendeeData.preConferenceCheckedInAt = new Date();
        attendeeData.preConferenceCheckedInBy = req.user._id as any;

        const mainConf = await generateQRCode({ email }, 'main-conference');
        attendeeData.mainConferenceQrCode = mainConf.token;
        attendeeData.ticketsent = true;

        const mainConfUrl = `${process.env.API_URL}${mainConf.filePath}`;
        await emailService.sendTicketWithQR(
          email,
          attendeeData.name,
          mainConfUrl,
          ticketType
        );
      } else {
        attendeeData.checkInStatus = CheckInStatus.CHECKED_IN;
        attendeeData.checkedInAt = new Date();
        attendeeData.checkedInBy = req.user._id as any;

        if (isLecturerPremium) {
          attendeeData.mainConferenceCheckInStatus = CheckInStatus.CHECKED_IN;
          attendeeData.mainConferenceCheckedInAt = new Date();
          attendeeData.mainConferenceCheckedInBy = req.user._id as any;
        }
      }

      const attendee = await User.create(attendeeData);

      res.status(201).json({
        success: true,
        message: 'Attendee registered and checked in successfully.',
        data: attendee,
      });
    }
  );

  manualCheckInPreConference = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { attendeeId } = req.body as { attendeeId?: string };

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can check in attendees.');
      }

      if (!attendeeId) {
        throw new BadRequestError('attendeeId is required.');
      }

      const attendee = await User.findById(attendeeId).populate(
        'preConferenceCheckedInBy',
        'name'
      );

      if (!attendee) {
        throw new NotFoundError('Attendee not found.');
      }

      if (attendee.role !== UserRole.USER) {
        throw new BadRequestError('Only attendees can be checked in.');
      }

      if (!attendee.preConferenceQrCode) {
        throw new BadRequestError(
          'This attendee does not have a pre-conference ticket.'
        );
      }

      if (attendee.preConferenceCheckInStatus === CheckInStatus.CHECKED_IN) {
        throw new BadRequestError(
          'This pre-conference ticket has already been used.'
        );
      }

      attendee.preConferenceCheckInStatus = CheckInStatus.CHECKED_IN;
      attendee.preConferenceCheckedInAt = new Date();
      attendee.preConferenceCheckedInBy = req.user._id as any;
      await attendee.save();

      await recordScanAttempt({
        agentId: req.user._id,
        scanSource: 'manual',
        scanStatus: 'success',
        sessionType: 'pre-conference',
        attendee,
        message: 'Pre-conference check-in successful.',
      });

      res.status(200).json({
        success: true,
        message: 'Pre-conference check-in successful.',
        data: attendee,
      });
    }
  );

  manualCheckInMainConference = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { attendeeId } = req.body as { attendeeId?: string };

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can check in attendees.');
      }

      if (!attendeeId) {
        throw new BadRequestError('attendeeId is required.');
      }

      const attendee = await User.findById(attendeeId).populate(
        'checkedInBy mainConferenceCheckedInBy',
        'name'
      );

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

      if (isLegacyTicket) {
        if (attendee.checkInStatus === CheckInStatus.CHECKED_IN) {
          throw new BadRequestError('This ticket has already been used.');
        }

        attendee.checkInStatus = CheckInStatus.CHECKED_IN;
        attendee.checkedInAt = new Date();
        attendee.checkedInBy = req.user._id as any;
        await attendee.save();

        await recordScanAttempt({
          agentId: req.user._id,
          scanSource: 'manual',
          scanStatus: 'success',
          sessionType: 'main-conference',
          attendee,
          message: 'Check-in successful.',
        });

        res.status(200).json({
          success: true,
          message: 'Check-in successful.',
          data: attendee,
        });
        return;
      }

      let checkedInField = attendee.checkInStatus;
      if (attendee.ticketType === TicketType.LECTURER_PREMIUM) {
        checkedInField =
          attendee.mainConferenceCheckInStatus ?? attendee.checkInStatus;
      }

      if (checkedInField === CheckInStatus.CHECKED_IN) {
        throw new BadRequestError('This ticket has already been used.');
      }

      if (attendee.ticketType === TicketType.LECTURER_PREMIUM) {
        attendee.mainConferenceCheckInStatus = CheckInStatus.CHECKED_IN;
        attendee.mainConferenceCheckedInAt = new Date();
        attendee.mainConferenceCheckedInBy = req.user._id as any;
      } else {
        attendee.checkInStatus = CheckInStatus.CHECKED_IN;
        attendee.checkedInAt = new Date();
        attendee.checkedInBy = req.user._id as any;
      }

      await attendee.save();

      await recordScanAttempt({
        agentId: req.user._id,
        scanSource: 'manual',
        scanStatus: 'success',
        sessionType: 'main-conference',
        attendee,
        message: 'Check-in successful.',
      });

      res.status(200).json({
        success: true,
        message: 'Check-in successful.',
        data: attendee,
      });
    }
  );
}

export default new AdminController();
