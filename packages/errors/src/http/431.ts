import { HttpError } from "./http_error.ts";

export class RequestHeaderFieldsTooLargeError extends HttpError {
  constructor(message?: string) {
    const status = 431;
    const code = "REQUEST_HEADER_FIELDS_TOO_LARGE";
    message = message ?? "Request Header Fields Too Large";

    super({ code, message, status });
  }
}
