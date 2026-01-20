/* eslint-disable max-lines */
import { Request, Response } from 'express';
import User, {
  UserRole,
  PaymentStatus,
  CheckInStatus,
  TicketType,
} from '../model/user.model';
import tokenService, { TokenPayload } from '../services/token.service'; // Import TokenPayload
import { UnauthorizedError, BadRequestError } from '../utils/customErrors';
import asyncHandler from '../utils/asyncHandler';
import logger from '../utils/logger'; // Added
import jwt from 'jsonwebtoken'; // Added
import { AuthenticatedRequest } from '../middleware/auth.middleware'; // Import AuthenticatedRequest
import passwordGenerator from '../utils/passwordGenerator';
import emailService from '../services/email.service';
import { generateQRCode } from '../services/qr.service';

interface IAuthResponse {
  success: boolean;
  accessToken?: string;
  message?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

class AuthController {
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    logger.info(`Login attempt for email: ${email}`);

    if (!email || !password) {
      throw new BadRequestError('Email and password are required.');
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn(`No account found for email: ${email}`);
      throw new BadRequestError('Invalid credentials');
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      logger.warn(`Incorrect password attempt for user: ${email}`);
      throw new BadRequestError('Invalid credentials');
    }

    if (!user.isActive) {
      logger.warn(`Inactive user attempted login: ${email}`);
      throw new BadRequestError(
        'Your account is not active. Please contact administrator.'
      );
    }

    const tokens = tokenService.generateTokens({
      userId: String(user._id),
      email: user.email,
      role: user.role,
    });

    user.refreshToken = tokens.refreshToken;
    user.lastLogin = new Date();
    await user.save();

    tokenService.setRefreshTokenCookie(res, tokens.refreshToken);
    logger.info(`Login successful for: ${email}, Role: ${user.role}`);

    const response: IAuthResponse = {
      success: true,
      accessToken: tokens.accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };

    res.json(response);
  });

  register = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        name,
        email,
        phoneNumber,
        ticketType,
        designation,
        department,
        referralCode,
        wantsPreConference,
      } = req.body;

      if (!req.file) {
        throw new BadRequestError('Payment receipt is required.');
      }

      // Handle file upload - multer stores the file info in req.file
      let paymentProof = '';
      if (req.file) {
        paymentProof = `${process.env.API_URL || 'http://localhost:3000'}/uploads/documents/${req.file.filename}`;
      }

      if (!name || !email || !phoneNumber || !ticketType) {
        throw new BadRequestError(
          'Name, email, phone number, and ticket type are required.'
        );
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new BadRequestError('Email already registered.');
      }

      // Create new user (no password for attendees)
      // Prepare user data
      const userData: any = {
        name,
        email,
        phoneNumber,
        ticketType,
        designation,
        department,
        paymentProof,
        referralCode,
        originalFilename: req.file ? req.file.originalname : '',
        fileSize: req.file ? req.file.size : 0,
        fileType: req.file ? req.file.mimetype : '',
        role: UserRole.USER,
        isActive: true,
        checkInStatus: CheckInStatus.NOT_CHECKED_IN,
        ticketsent: false,
      };

      // Handle Researcher Premium pre-conference choice
      if (ticketType === TicketType.RESEARCHER_PREMIUM) {
        if (wantsPreConference === true || wantsPreConference === 'true') {
          userData.wantsPreConference = true;
          userData.preConferenceDeclinedDuringReg = false;
        } else if (
          wantsPreConference === false ||
          wantsPreConference === 'false'
        ) {
          userData.wantsPreConference = false;
          userData.preConferenceDeclinedDuringReg = true;
        }
      }

      // Create new user
      const user = await User.create(userData);

      // Send registration confirmation email
      await emailService.sendRegistrationConfirmation(
        user.email,
        user.name,
        user.ticketType,
        user.wantsPreConference
      );

      // Generate tokens
      const tokens = tokenService.generateTokens({
        userId: String(user._id),
        email: user.email,
        role: user.role,
      });

      // Save refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      // Set cookie
      tokenService.setRefreshTokenCookie(res, tokens.refreshToken);

      const response: IAuthResponse = {
        success: true,
        accessToken: tokens.accessToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };

      res.status(201).json(response);
    }
  );

  createAgent = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { name, email } = req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new UnauthorizedError(
          'You are not authorized to perform this action'
        );
      }

      if (!name || !email) {
        throw new BadRequestError('Name and email are required.');
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new BadRequestError('Email already registered.');
      }

      const password = passwordGenerator(12);

      const agent = await User.create({
        name,
        email,
        password,
        role: UserRole.AGENT,
        isActive: true,
      });

      // Send credentials to agent via email
      await emailService.sendAgentCredentials(email, password);

      res.status(201).json({
        success: true,
        message: 'Agent created successfully.',
        user: {
          id: agent._id.toString(),
          name: agent.name,
          email: agent.email,
          role: agent.role,
        },
      });
    }
  );

  refreshToken = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token is required');
      }

      const decoded = await tokenService.verifyRefreshToken(refreshToken);
      const user = await User.findById(decoded.userId);

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      const userId = user._id.toString(); // Use toString() to avoid ObjectId casting issues
      const tokens = await tokenService.rotateRefreshToken(refreshToken, {
        userId: userId,
        email: user.email,
        role: user.role, // Use user.role from DB, not from old token payload
      });

      user.refreshToken = tokens.refreshToken;
      await user.save();

      tokenService.setRefreshTokenCookie(res, tokens.refreshToken);

      const response: IAuthResponse = {
        success: true,
        accessToken: tokens.accessToken,
        user: {
          // Return updated user info with refresh
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };

      res.status(200).json(response);
    }
  );

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken) as TokenPayload; // Use jwt.decode here
        if (decoded && decoded.exp) {
          await tokenService.blacklistToken(
            refreshToken,
            new Date(decoded.exp * 1000)
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        logger.warn('Invalid token during logout:', errorMessage);
      }
    }

    tokenService.clearRefreshTokenCookie(res);

    const response: IAuthResponse = {
      success: true,
      message: 'Logged out successfully',
    };

    res.status(200).json(response);
  });

  // Use the custom request interface
  getMe = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const user = req.user; // This user object is populated by middleware
      const response: IAuthResponse = {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };

      res.status(200).json(response);
    }
  );

  verifyInvite = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { token } = req.query;

      if (!token) {
        throw new BadRequestError('Invite token is required.');
      }

      const user = await User.findOne({
        inviteToken: token as string,
        inviteTokenExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new BadRequestError('Invalid or expired invite token.');
      }

      res.status(200).json({
        success: true,
        data: {
          email: user.email,
          name: user.name,
          phoneNumber: user.phoneNumber,
          ticketType: user.ticketType,
          designation: user.designation,
          department: user.department,
        },
      });
    }
  );

  completeRegistration = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const {
        inviteToken,
        name,
        phoneNumber,
        designation,
        department,
        wantsPreConference,
      } = req.body;

      if (!inviteToken || !name || !phoneNumber) {
        throw new BadRequestError(
          'Invite token, name and phone number are required.'
        );
      }

      const user = await User.findOne({
        inviteToken,
        inviteTokenExpires: { $gt: new Date() },
      });

      if (!user) {
        throw new BadRequestError('Invalid or expired invite token.');
      }

      user.name = name;
      user.phoneNumber = phoneNumber;
      user.designation = designation;
      user.department = department;

      // Handle Researcher Premium pre-conference choice
      if (user.ticketType === TicketType.RESEARCHER_PREMIUM) {
        if (wantsPreConference === true || wantsPreConference === 'true') {
          user.wantsPreConference = true;
          user.preConferenceDeclinedDuringReg = false;
        } else if (
          wantsPreConference === false ||
          wantsPreConference === 'false'
        ) {
          user.wantsPreConference = false;
          user.preConferenceDeclinedDuringReg = true;
        }
      }

      user.paymentStatus = PaymentStatus.CONFIRMED;
      user.inviteToken = undefined;
      user.inviteTokenExpires = undefined;
      user.isActive = true;

      // Check if needs both tickets (Researcher Premium with pre-conference OR Lecturer Premium)
      const needsBothTickets =
        user.ticketType === TicketType.LECTURER_PREMIUM ||
        (user.ticketType === TicketType.RESEARCHER_PREMIUM &&
          user.wantsPreConference);

      if (needsBothTickets) {
        // Generate pre-conference ticket
        const preConf = await generateQRCode(
          { email: user.email },
          'pre-conference'
        );
        user.preConferenceQrCode = preConf.token;

        const preConfUrl = `${process.env.API_URL}${preConf.filePath}`;
        await emailService.sendPreConferenceTicket(
          user.email,
          user.name,
          preConfUrl,
          user.ticketType!
        );

        // Generate main conference ticket
        const mainConf = await generateQRCode(
          { email: user.email },
          'main-conference'
        );
        user.mainConferenceQrCode = mainConf.token;

        const mainConfUrl = `${process.env.API_URL}${mainConf.filePath}`;
        await emailService.sendTicketWithQR(
          user.email,
          user.name,
          mainConfUrl,
          user.ticketType!
        );
      } else {
        // Single ticket
        const { token, filePath } = await generateQRCode({ email: user.email });
        user.qrCode = token;

        if (!user.ticketType) {
          throw new BadRequestError('User does not have a ticket type.');
        }

        const qrCodeUrl = `${process.env.API_URL}${filePath}`;
        await emailService.sendTicketWithQR(
          user.email,
          user.name,
          qrCodeUrl,
          user.ticketType
        );
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: 'Registration completed successfully.',
      });
    }
  );

  respondToPreConferenceInvite = asyncHandler(
    async (req: Request, res: Response) => {
      const { token, response } = req.body;

      if (!token || !response) {
        throw new BadRequestError('Token and response are required.');
      }

      const attendee = await User.findOne({
        inviteToken: token,
        inviteTokenExpires: { $gt: new Date() },
      });

      if (!attendee) {
        throw new BadRequestError('Invalid or expired invite token.');
      }

      attendee.preConferenceInviteResponse = response;
      attendee.preConferenceInviteRespondedAt = new Date();
      attendee.inviteToken = undefined;
      attendee.inviteTokenExpires = undefined;

      if (response === 'yes') {
        attendee.wantsPreConference = true;

        // Generate and send pre-conference ticket immediately
        const preConf = await generateQRCode(
          { email: attendee.email },
          'pre-conference'
        );
        attendee.preConferenceQrCode = preConf.token;

        const preConfUrl = `${process.env.API_URL}${preConf.filePath}`;
        if (attendee.ticketType) {
          await emailService.sendPreConferenceTicket(
            attendee.email,
            attendee.name,
            preConfUrl,
            attendee.ticketType
          );
        }
      } else {
        attendee.wantsPreConference = false;
      }

      await attendee.save();

      res.status(200).json({
        success: true,
        message: `Response recorded: ${response}. ${response === 'yes' ? 'Pre-conference ticket sent.' : ''}`,
      });
    }
  );
}

export default new AuthController();
