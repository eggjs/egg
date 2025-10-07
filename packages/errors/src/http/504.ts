import HttpError from './http_error';

class GatewayTimeoutError extends HttpError {
  constructor(message?: string) {
    const status = 504;
    const code = 'GATEWAY_TIMEOUT';
    message = message || 'Gateway Timeout';

    super({ code, message, status });
  }
}

export default GatewayTimeoutError;
