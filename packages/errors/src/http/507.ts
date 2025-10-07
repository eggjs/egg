import HttpError from './http_error';

class InsufficientStorageError extends HttpError {
  constructor(message?: string) {
    const status = 507;
    const code = 'INSUFFICIENT_STORAGE';
    message = message || 'Insufficient Storage';

    super({ code, message, status });
  }
}

export default InsufficientStorageError;
