import HttpError from './http_error';

class ExpectationFailedError extends HttpError {
  constructor(message?: string) {
    const status = 417;
    const code = 'EXPECTATION_FAILED';
    message = message || 'Expectation Failed';

    super({ code, message, status });
  }
}

export default ExpectationFailedError;
