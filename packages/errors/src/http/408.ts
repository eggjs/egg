import { HttpError } from './http_error.ts';

export class RequestTimeoutError extends HttpError {
  constructor(message?: string) {
    const status = 408;
    const code = 'REQUEST_TIMEOUT';
    message = message ?? 'Request Timeout';

    super({ code, message, status });
  }
}
