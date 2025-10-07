import { ErrorOptions } from '../error_options.ts';
import type { HttpHeader } from './http_header.ts';

export class HttpErrorOptions extends ErrorOptions {
  public status: number;
  public headers?: HttpHeader;
}
