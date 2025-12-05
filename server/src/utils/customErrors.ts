class AppError extends Error {
  statusCode: number;
  status: 'fail' | 'error';
  isOperational: boolean;
    
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode.toString().startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
  
    Error.captureStackTrace(this, this.constructor);
  }
}
  
class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}
  
class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}
  
class UnauthorizedError extends AppError {
  constructor(message: string) {
    super(message, 401);
  }
}
  
class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}
  
class RateLimitError extends AppError {
  retryAfter?: number;
    
  constructor(message: string, retryAfter?: number) {
    super(message, 429);
    this.retryAfter = retryAfter;
  }
}
  
class ExternalServiceAPIError extends AppError {
  details?: any;
    
  constructor(message: string, statusCode: number, details?: any) {
    super(message, statusCode);
    this.details = details;
  }
}
  
class ValidationError extends AppError {
  details?: any;
    
  constructor(message: string, details?: any) {
    super(message, 422);
    this.details = details;
  }
}
  
class CastError extends AppError {
  path: string;
  value: any;
    
  constructor(path: string, value: any) {
    super(`Invalid ${path}: ${value}`, 400);
    this.path = path;
    this.value = value;
  }
}
  
class DuplicateKeyError extends AppError {
  keyValue: Record<string, any>;
  code: number;
    
  constructor(field: string, value: any) {
    super(`A record with this ${field} already exists`, 409);
    this.keyValue = { [field]: value };
    this.code = 11000;
  }
}
  
class FileUploadError extends AppError {
  code: string;
    
  constructor(message: string = 'File too large. Maximum size is 3MB.') {
    super(message, 400);
    this.code = 'LIMIT_FILE_SIZE';
  }
}
  
export {
  AppError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
  ExternalServiceAPIError,
  ForbiddenError,
  ValidationError,
  CastError,
  DuplicateKeyError,
  FileUploadError,
};