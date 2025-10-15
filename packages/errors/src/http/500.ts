import { HttpError } from "./http_error.ts";

export class InternalServerError extends HttpError {
  constructor(message?: string) {
    const status = 500;
    const code = "INTERNAL_SERVER_ERROR";
    message = message ?? "Internal Server Error";

    super({ code, message, status });
  }
}
