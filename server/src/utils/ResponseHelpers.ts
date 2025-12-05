import { Response } from 'express';

export const ServerError = (
  res: Response,
  message: string,
  status = 500
) => {
  return res.status(status).json({ success: false, message });
};

export const SuccessResponse = (
  res: Response,
  message: string,
  status = 200,
  data?: any,
) => {
  return res.status(status).json({ success: true, message, data });
};