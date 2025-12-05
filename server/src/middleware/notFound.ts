import type { Request, Response, NextFunction } from 'express';

const notFound = (req: Request, res: Response, next: NextFunction) => {
  const error: any = new Error(`Resource Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
};

export default notFound;