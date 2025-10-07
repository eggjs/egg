import HttpError from './http_error';

class NotFoundError extends HttpError {
  constructor(message?: string) {
    const status = 404;
    const code = 'NOT_FOUND';
    message = message || 'Not Found';

    super({ code, message, status });
  }
}

export default NotFoundError;
