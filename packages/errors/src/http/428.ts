import HttpError from './http_error';

class PreconditionRequiredError extends HttpError {
  constructor(message?: string) {
    const status = 428;
    const code = 'PRECONDITION_REQUIRED';
    message = message || 'Precondition Required';

    super({ code, message, status });
  }
}

export default PreconditionRequiredError;
