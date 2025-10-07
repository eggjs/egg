import HttpError from './http_error';

class MisdirectedRequestError extends HttpError {
  constructor(message?: string) {
    const status = 421;
    const code = 'MISDIRECTED_REQUEST';
    message = message || 'Misdirected Request';

    super({ code, message, status });
  }
}

export default MisdirectedRequestError;
