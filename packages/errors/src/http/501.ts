import { HttpError } from "./http_error.ts";

export class NotImplementedError extends HttpError {
  constructor(message?: string) {
    const status = 501;
    const code = "NOT_IMPLEMENTED";
    message = message ?? "Not Implemented";

    super({ code, message, status });
  }
}
