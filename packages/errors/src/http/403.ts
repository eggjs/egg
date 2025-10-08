import { HttpError } from './http_error.ts';

export class ForbiddenError extends HttpError {
  constructor(message?: string) {
    const status = 403;
    const code = 'FORBIDDEN';
    message = message ?? 'Forbidden';

    super({ code, message, status });
  }
}
