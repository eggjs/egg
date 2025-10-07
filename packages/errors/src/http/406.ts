import HttpError from './http_error';

class NotAcceptableError extends HttpError {
  constructor(message?: string) {
    const status = 406;
    const code = 'NOT_ACCEPTABLE';
    message = message || 'Not Acceptable';

    super({ code, message, status });
  }
}

export default NotAcceptableError;
