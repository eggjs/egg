import { HttpError } from "./http_error.ts";

export class NotExtendedError extends HttpError {
  constructor(message?: string) {
    const status = 510;
    const code = "NOT_EXTENDED";
    message = message ?? "Not Extended";

    super({ code, message, status });
  }
}
