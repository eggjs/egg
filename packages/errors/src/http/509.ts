import HttpError from './http_error';

class BandwidthLimitExceededError extends HttpError {
  constructor(message?: string) {
    const status = 509;
    const code = 'BANDWIDTH_LIMIT_EXCEEDED';
    message = message || 'Bandwidth Limit Exceeded';

    super({ code, message, status });
  }
}

export default BandwidthLimitExceededError;
