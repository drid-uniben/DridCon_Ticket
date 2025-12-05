import QRCode from 'qrcode';
import logger from '../utils/logger';
import tokenService from './token.service';
import validateEnv from '../utils/validateEnv';

validateEnv();

const QR_CODE_SECRET = process.env.QR_CODE_SECRET!;
if (!QR_CODE_SECRET) {
  throw new Error('QR_CODE_SECRET must be defined in environment variables');
}

export const generateQRCode = async (
  payload: Record<string, any>
): Promise<{ token: string; dataUrl: string }> => {
  try {
    const token = tokenService.generateToken(payload, QR_CODE_SECRET, '365d');
    const dataUrl = await QRCode.toDataURL(token);
    return { token, dataUrl };
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
