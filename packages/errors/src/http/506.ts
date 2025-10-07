import HttpError from './http_error';

class VariantAlsoNegotiatesError extends HttpError {
  constructor(message?: string) {
    const status = 506;
    const code = 'VARIANT_ALSO_NEGOTIATES';
    message = message || 'Variant Also Negotiates';

    super({ code, message, status });
  }
}

export default VariantAlsoNegotiatesError;
