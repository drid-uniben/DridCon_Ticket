import { Request, Response } from 'express';
import User from '../model/user.model';
import tokenService, { TokenPayload } from '../services/token.service'; // Import TokenPayload
import { UnauthorizedError, BadRequestError } from '../utils/customErrors';
import asyncHandler from '../utils/asyncHandler';
import logger from '../utils/logger'; // Added
// import { ObjectId, Document } from 'mongoose'; // Removed unused Document, ObjectId
import jwt from 'jsonwebtoken'; // Added
import { AuthenticatedRequest } from '../middleware/auth.middleware'; // Import AuthenticatedRequest

interface IAuthResponse {
  success: boolean;
  accessToken?: string;
  message?: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    balance?: number;
    allocatedFunds?: number;
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
        balance: user.wallet?.balance,
        allocatedFunds: user.agentProfile?.allocatedFunds,
      },
    };

    res.json(response);
  });

  signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, role = "user" } = req.body;
  
    if (!name || !email || !password) {
      throw new BadRequestError("Name, email, and password are required.");
    }
  
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new BadRequestError("Email already registered.");
    }
  
    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role,
      isActive: true, // NEW users should be active by default
    });
  
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
        balance: user.wallet?.balance,
        allocatedFunds: user.agentProfile?.allocatedFunds,
      },
    };
  
    res.status(201).json(response);
  });

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
        user: { // Return updated user info with refresh
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            balance: user.wallet?.balance,
            allocatedFunds: user.agentProfile?.allocatedFunds,
        }
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
          balance: user.wallet?.balance,
          allocatedFunds: user.agentProfile?.allocatedFunds,
        },
      };

      res.status(200).json(response);
    }
  );
}

export default new AuthController();
