import HttpError from './http_error';

class FailedDependencyError extends HttpError {
  constructor(message?: string) {
    const status = 424;
    const code = 'FAILED_DEPENDENCY';
    message = message || 'Failed Dependency';

    super({ code, message, status });
  }
}

export default FailedDependencyError;
