import HttpError from './http_error';

class RequestTimeoutError extends HttpError {
  constructor(message?: string) {
    const status = 408;
    const code = 'REQUEST_TIMEOUT';
    message = message || 'Request Timeout';

    super({ code, message, status });
  }
}

export default RequestTimeoutError;
