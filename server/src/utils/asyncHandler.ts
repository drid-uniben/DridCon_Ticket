import type { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncFunction<T extends Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<any>;

const asyncHandler = <T extends Request>(
  execution: AsyncFunction<T>
): RequestHandler => { // Change return type to RequestHandler
  return (req, res, next) => { // Type of req, res, next inferred from RequestHandler
    execution(req as T, res, next).catch(next); // Cast req to T inside
  };
};

export default asyncHandler;
