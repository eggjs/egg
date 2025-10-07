import HttpError from './http_error';

class PaymentRequiredError extends HttpError {
  constructor(message?: string) {
    const status = 402;
    const code = 'PAYMENT_REQUIRED';
    message = message || 'Payment Required';

    super({ code, message, status });
  }
}

export default PaymentRequiredError;
