import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler';
import logger from '../utils/logger';
import User, { PaymentStatus, UserRole } from '../model/user.model';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/customErrors';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import passwordGenerator from '../utils/passwordGenerator';
import {
  sendAgentCredentials,
  sendAttendeeInvite,
  sendTicketWithQR,
} from '../services/email.service';
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

      await sendAgentCredentials(agent.email, generatedPassword);

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

  manualRegisterAttendee = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { name, email, phoneNumber, ticketType, designation, department } = req.body;

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
        throw new BadRequestError('An attendee with this email already exists.');
      }

      const { token, dataUrl } = await generateQRCode({ email });

      const attendee = await User.create({
        name,
        email,
        phoneNumber,
        ticketType,
        designation,
        department,
        qrCode: token,
        paymentStatus: PaymentStatus.CONFIRMED,
        role: UserRole.USER,
      });

      await sendTicketWithQR(email, name, dataUrl);

      res.status(201).json({
        success: true,
        message: 'Attendee registered successfully.',
        data: attendee,
      });
    }
  );

  inviteAttendee = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { email } = req.body;

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
        inviteToken,
        inviteTokenExpires,
        role: UserRole.USER,
        isActive: false, // User is not active until they complete registration
      });

      await sendAttendeeInvite(email, inviteToken);

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

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can approve registrations.');
      }

      const attendee = await User.findById(attendeeId);
      if (!attendee) {
        throw new NotFoundError('Attendee not found.');
      }

      if (attendee.paymentStatus !== PaymentStatus.PENDING) {
        throw new BadRequestError('This registration is not pending approval.');
      }

      const { token, dataUrl } = await generateQRCode({ email: attendee.email });

      attendee.paymentStatus = PaymentStatus.CONFIRMED;
      attendee.qrCode = token;
      await attendee.save();

      await sendTicketWithQR(attendee.email, attendee.name, dataUrl);

      res.status(200).json({
        success: true,
        message: 'Registration approved successfully.',
        data: attendee,
      });
    }
  );

  declineRegistration = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { attendeeId } = req.params;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only administrators can decline registrations.');
      }

      const attendee = await User.findById(attendeeId);
      if (!attendee) {
        throw new NotFoundError('Attendee not found.');
      }

      attendee.paymentStatus = PaymentStatus.DECLINED;
      await attendee.save();

      // Optional: Send an email to the user about the decline.

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

      const attendees = await User.find({ role: UserRole.USER }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        count: attendees.length,
        data: attendees,
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

      const totalAttendees = await User.countDocuments({ role: UserRole.USER });
      const checkedInAttendees = await User.countDocuments({
        role: UserRole.USER,
        checkInStatus: 'checked-in',
      });

      res.status(200).json({
        success: true,
        data: {
          totalAttendees,
          checkedInAttendees,
        },
      });
    }
  );
}

export default new AdminController();
