import { HttpError } from "./http_error.ts";

export class TooManyRequestsError extends HttpError {
  constructor(message?: string) {
    const status = 429;
    const code = "TOO_MANY_REQUESTS";
    message = message ?? "Too Many Requests";

    super({ code, message, status });
  }
}
