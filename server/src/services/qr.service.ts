import QRCode from 'qrcode';
import logger from '../utils/logger';
import tokenService from './token.service';
import validateEnv from '../utils/validateEnv';
import path from 'path';
import fs from 'fs';

validateEnv();

const QR_CODE_SECRET = process.env.QR_CODE_SECRET!;
if (!QR_CODE_SECRET) {
  throw new Error('QR_CODE_SECRET must be defined in environment variables');
}

export const generateQRCode = async (
  payload: Record<string, any>,
  sessionType?: 'pre-conference' | 'main-conference'
): Promise<{ token: string; filePath: string }> => {
  try {
    // Include session type in the token payload
    const tokenPayload = {
      ...payload,
      sessionType: sessionType || 'main-conference',
    };

    const token = tokenService.generateToken(
      tokenPayload,
      QR_CODE_SECRET,
      '365d'
    );
    const qrCodeDirectory = path.join(__dirname, '..', 'uploads', 'qrcodes');

    // Ensure the directory exists
    if (!fs.existsSync(qrCodeDirectory)) {
      fs.mkdirSync(qrCodeDirectory, { recursive: true });
    }

    const sessionSuffix = sessionType ? `-${sessionType}` : '';
    const filePath = path.join(
      qrCodeDirectory,
      `${payload.email}-${Date.now()}${sessionSuffix}.png`
    );

    await QRCode.toFile(filePath, token);

    const fileUrl = `/uploads/qrcodes/${path.basename(filePath)}`;

    return { token, filePath: fileUrl };
  } catch (error) {
    logger.error('Error generating QR code:', error);
    throw new Error('Could not generate QR code.');
  }
};

export const verifyQRCode = (token: string): Record<string, any> | null => {
  try {
    const decoded = tokenService.verifyToken(token, QR_CODE_SECRET);
    return decoded as Record<string, any>;
  } catch (error) {
    logger.error('Error verifying QR code:', error);
    return null;
  }
};
