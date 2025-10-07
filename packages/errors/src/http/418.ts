import HttpError from './http_error';

class ImATeapotError extends HttpError {
  constructor(message?: string) {
    const status = 418;
    const code = 'IMA_TEAPOT';
    message = message || "I'm a teapot";

    super({ code, message, status });
  }
}

export default ImATeapotError;
