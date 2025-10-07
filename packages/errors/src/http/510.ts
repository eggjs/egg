import HttpError from './http_error';

class NotExtendedError extends HttpError {
  constructor(message?: string) {
    const status = 510;
    const code = 'NOT_EXTENDED';
    message = message || 'Not Extended';

    super({ code, message, status });
  }
}

export default NotExtendedError;
