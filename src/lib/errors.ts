/** Error carrying a stable machine-readable `code`; the UI translates codes through messages/*.json (`errors.<CODE>`). */
export class AppError extends Error {
  constructor(public status: number, public code: string, public details?: unknown) {
    super(code);
  }
}
export const badRequest = (code = 'BAD_REQUEST', details?: unknown) => new AppError(400, code, details);
export const unauthorized = (code = 'UNAUTHENTICATED') => new AppError(401, code);
export const forbidden = (code = 'FORBIDDEN') => new AppError(403, code);
export const notFound = (code = 'NOT_FOUND') => new AppError(404, code);
export const conflict = (code = 'CONFLICT', details?: unknown) => new AppError(409, code, details);
export const unprocessable = (code = 'VALIDATION', details?: unknown) => new AppError(422, code, details);
