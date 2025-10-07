import HttpError from './http_error';

class LoopDetectedError extends HttpError {
  constructor(message?: string) {
    const status = 508;
    const code = 'LOOP_DETECTED';
    message = message || 'Loop Detected';

    super({ code, message, status });
  }
}

export default LoopDetectedError;
