import HttpError from './http_error';

class PayloadTooLargeError extends HttpError {
  constructor(message?: string) {
    const status = 413;
    const code = 'PAYLOAD_TOO_LARGE';
    message = message || 'Payload Too Large';

    super({ code, message, status });
  }
}

export default PayloadTooLargeError;
