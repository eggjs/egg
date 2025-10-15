import { HttpError } from "./http_error.ts";

export class URITooLongError extends HttpError {
  constructor(message?: string) {
    const status = 414;
    const code = "URI_TOO_LONG";
    message = message ?? "URI Too Long";

    super({ code, message, status });
  }
}
