import type { ErrorOptions } from '../error_options.ts';
import type { HttpHeader } from './http_header.ts';

export interface HttpErrorOptions extends ErrorOptions {
  status: number;
  headers?: HttpHeader;
}
