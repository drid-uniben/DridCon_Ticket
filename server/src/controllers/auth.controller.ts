import { Request, Response } from 'express';
import User, { UserRole, PaymentStatus } from '../model/user.model';
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

  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, phoneNumber, ticketType, designation, department } =
      req.body;

    // Handle file upload - multer stores the file info in req.file
    const paymentProof = req.file ? req.file.filename : '';

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
    const user = await User.create({
      name,
      email,
      phoneNumber,
      ticketType,
      designation,
      department,
      paymentProof,
      role: UserRole.USER,
      isActive: true,
    });

    // Send registration confirmation email
    await emailService.sendRegistrationConfirmation(user.email, user.name);

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
  });

  createAgent = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const { name, email } = req.body;

      if (req.user?.role !== UserRole.ADMIN) {
        throw new UnauthorizedError('You are not authorized to perform this action');
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

  verifyInvite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.query;

    if (!token) {
      throw new BadRequestError('Invite token is required.');
    }

    const user = await User.findOne({ inviteToken: token as string, inviteTokenExpires: { $gt: new Date() } });

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
  });


  completeRegistration = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { inviteToken, name, phoneNumber, ticketType, designation, department } = req.body;

    if (!inviteToken || !name || !phoneNumber || !ticketType) {
      throw new BadRequestError('Invite token, name, phone number, and ticket type are required.');
    }

    const user = await User.findOne({ inviteToken, inviteTokenExpires: { $gt: new Date() } });

    if (!user) {
      throw new BadRequestError('Invalid or expired invite token.');
    }

    const { token, filePath } = await generateQRCode({ email: user.email });

    user.name = name;
    user.phoneNumber = phoneNumber;
    user.ticketType = ticketType;
    user.designation = designation;
    user.department = department;
    user.qrCode = token;
    user.paymentStatus = PaymentStatus.CONFIRMED;
    user.inviteToken = undefined;
    user.inviteTokenExpires = undefined;
    user.isActive = true;

    await user.save();

    if (!user.ticketType) {
      throw new BadRequestError('User does not have a ticket type.');
    }

    const qrCodeUrl = `${process.env.API_URL}${filePath}`;
    await emailService.sendTicketWithQR(user.email, user.name, qrCodeUrl, user.ticketType);

    res.status(200).json({
      success: true,
      message: 'Registration completed successfully.'
    });
  });
}

export default new AuthController();
