import HttpError from './http_error';

class BadRequestError extends HttpError {
  constructor(message?: string) {
    const status = 400;
    const code = 'BAD_REQUEST';
    message = message || 'Bad Request';

    super({ code, message, status });
  }
}

export default BadRequestError;
