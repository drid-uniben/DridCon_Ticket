import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import authController from '../controllers/auth.controller';
import { rateLimiter, authenticateToken } from '../middleware/auth.middleware'; // Keeping authenticateToken for getMe

const router = Router();

const standardLimit = rateLimiter(20, 60 * 60 * 1000);

const getUploadsPath = (): string => {
  if (process.env.NODE_ENV === 'production') {
    // Go up to dist/ and then to uploads/documents
    return path.join(__dirname, '..', '..', 'uploads', 'documents');
  } else {
    // In development, use the existing path
    return path.join(process.cwd(), 'src', 'uploads', 'documents');
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadsPath());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, and PNG are allowed.'));
    }
  }
});

// Single login route for all user roles
router.post('/register', standardLimit, upload.single('paymentProof'), authController.register);
router.post('/login', standardLimit, authController.login);
router.post('/refresh-token', standardLimit, authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/complete-registration', standardLimit, authController.completeRegistration)

// Route to get current user info - protected by auth middleware
router.get('/me', authenticateToken, authController.getMe); 

export default router;
