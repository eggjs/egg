import { HttpError } from './http_error.ts';

export class UnorderedCollectionError extends HttpError {
  constructor(message?: string) {
    const status = 425;
    const code = 'UNORDERED_COLLECTION';
    message = message ?? 'Unordered Collection';

    super({ code, message, status });
  }
}
