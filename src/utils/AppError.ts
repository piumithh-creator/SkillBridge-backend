export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(msg = "Bad request", details?: unknown) { return new AppError(400, msg, details); }
  static unauthorized(msg = "Authentication required") { return new AppError(401, msg); }
  static forbidden(msg = "You do not have permission to perform this action") { return new AppError(403, msg); }
  static notFound(msg = "Resource not found") { return new AppError(404, msg); }
  static conflict(msg = "Conflict") { return new AppError(409, msg); }
}
