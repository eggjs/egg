import HttpError from './http_error';

class UnauthorizedError extends HttpError {
  constructor(message?: string) {
    const status = 401;
    const code = 'UNAUTHORIZED';
    message = message || 'Unauthorized';

    super({ code, message, status });
  }
}

export default UnauthorizedError;
