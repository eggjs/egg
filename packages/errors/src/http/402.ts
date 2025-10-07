import { HttpError } from './http_error.ts';

export class PaymentRequiredError extends HttpError {
  constructor(message?: string) {
    const status = 402;
    const code = 'PAYMENT_REQUIRED';
    message = message ?? 'Payment Required';

    super({ code, message, status });
  }
}
