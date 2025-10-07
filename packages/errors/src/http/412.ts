import HttpError from './http_error';

class PreconditionFailedError extends HttpError {
  constructor(message?: string) {
    const status = 412;
    const code = 'PRECONDITION_FAILED';
    message = message || 'Precondition Failed';

    super({ code, message, status });
  }
}

export default PreconditionFailedError;
