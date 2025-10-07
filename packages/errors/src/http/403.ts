import HttpError from './http_error';

class ForbiddenError extends HttpError {
  constructor(message?: string) {
    const status = 403;
    const code = 'FORBIDDEN';
    message = message || 'Forbidden';

    super({ code, message, status });
  }
}

export default ForbiddenError;
