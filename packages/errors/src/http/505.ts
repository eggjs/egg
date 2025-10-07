import { HttpError } from './http_error.ts';

export class HTTPVersionNotSupportedError extends HttpError {
  constructor(message?: string) {
    const status = 505;
    const code = 'HTTP_VERSION_NOT_SUPPORTED';
    message = message ?? 'HTTP Version Not Supported';

    super({ code, message, status });
  }
}
