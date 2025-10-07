import { HttpError } from './http_error.ts';

export class FailedDependencyError extends HttpError {
  constructor(message?: string) {
    const status = 424;
    const code = 'FAILED_DEPENDENCY';
    message = message ?? 'Failed Dependency';

    super({ code, message, status });
  }
}
