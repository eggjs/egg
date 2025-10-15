import { EggBaseError } from "../base_error.ts";
import type { HttpErrorOptions } from "./http_error_options.ts";
import type { HttpHeader } from "./http_header.ts";

export class HttpError extends EggBaseError<HttpErrorOptions> {
  public status: number;
  public headers: HttpHeader;
  declare protected options: HttpErrorOptions;

  constructor(options?: HttpErrorOptions) {
    super(options);

    this.status = this.options.status;
    this.headers = this.options.headers ?? {};
  }
}
