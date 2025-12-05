import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/customErrors';
import tokenService from '../services/token.service';
import User, { IUser, UserRole } from '../model/user.model';
import { Document } from 'mongoose'; // Import Document

interface UserPayload {
  userId: string;
}

export interface AuthenticatedRequest extends Request { // Exported interface
  user: (IUser & Document);
}

// Authenticate admin access token
const authenticateAdminToken = async (
  req: Request, // Changed from AuthRequest
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = (await tokenService.verifyAccessToken(
      token
    )) as UserPayload;
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.role !== 'admin') {
      throw new ForbiddenError('Access denied: Admin privileges required');
    }

    (req as AuthenticatedRequest).user = user; // Cast here
    next();
  } catch (error) {
    next(error);
  }
};

// Authenticate author access token
const authenticateWasteAgentToken = async (
  req: Request, // Changed from AuthRequest
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = (await tokenService.verifyAccessToken(
      token
    )) as UserPayload;
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.role !== UserRole.AGENT) {
      throw new ForbiddenError('Access denied: Agent privileges required');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account is not active');
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Authenticate reviewer access token
const authenticateWasteUserToken = async (
  req: Request, // Changed from AuthRequest
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = (await tokenService.verifyAccessToken(
      token
    )) as UserPayload;
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.role !== UserRole.USER) {
      throw new ForbiddenError('Access denied: User privileges required');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account is not active');
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Authenticate any valid user (admin or researcher)
const authenticateToken = async (
  req: Request, // Changed from AuthRequest
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = (await tokenService.verifyAccessToken(
      token
    )) as UserPayload;
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!['admin', 'agent', 'user'].includes(user.role)) {
      throw new ForbiddenError('Invalid user role');
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Check article moderation permissions
const authorizeModeration = async (
  req: Request, // Changed from AuthRequest
  res: Response,
  next: NextFunction
) => {
  try {
    if (! (req as AuthenticatedRequest).user || (req as AuthenticatedRequest).user.role !== 'admin') {
      throw new ForbiddenError('Access denied: Admin privileges required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting middleware for public endpoints
const rateLimiter = (limit: number, windowMs: number) => {
  const requests = new Map<string, number[]>();

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip as string;
      const now = Date.now();

      // Clean old requests
      if (requests.has(ip)) {
        const userRequests = requests.get(ip) || [];
        const validRequests = userRequests.filter(
          (timestamp) => now - timestamp < windowMs
        );

        if (validRequests.length >= limit) {
          throw new UnauthorizedError('Rate limit exceeded');
        }

        requests.set(ip, [...validRequests, now]);
      } else {
        requests.set(ip, [now]);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export {
  authenticateAdminToken,
  authenticateWasteAgentToken,
  authenticateWasteUserToken,
  authenticateToken,
  authorizeModeration,
  rateLimiter,
};
