import HttpError from './http_error';

class GoneError extends HttpError {
  constructor(message?: string) {
    const status = 410;
    const code = 'GONE';
    message = message || 'Gone';

    super({ code, message, status });
  }
}

export default GoneError;
