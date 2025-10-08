import { HttpError } from './http_error.ts';

export class ExpectationFailedError extends HttpError {
  constructor(message?: string) {
    const status = 417;
    const code = 'EXPECTATION_FAILED';
    message = message ?? 'Expectation Failed';

    super({ code, message, status });
  }
}
