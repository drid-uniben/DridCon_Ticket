import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { rateLimiter, authenticateToken } from '../middleware/auth.middleware'; // Keeping authenticateToken for getMe

const router = Router();

const standardLimit = rateLimiter(20, 60 * 60 * 1000);

// Single login route for all user roles
router.post('/register', standardLimit, authController.register);
router.post('/login', standardLimit, authController.login);
router.post('/refresh-token', standardLimit, authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/complete-registration', standardLimit, authController.completeRegistration)

// Route to get current user info - protected by auth middleware
router.get('/me', authenticateToken, authController.getMe); 

export default router;
