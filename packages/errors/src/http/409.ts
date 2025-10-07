import HttpError from './http_error';

class ConflictError extends HttpError {
  constructor(message?: string) {
    const status = 409;
    const code = 'CONFLICT';
    message = message || 'Conflict';

    super({ code, message, status });
  }
}

export default ConflictError;
