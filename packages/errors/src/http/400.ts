import { HttpError } from "./http_error.ts";

export class BadRequestError extends HttpError {
  constructor(message?: string) {
    const status = 400;
    const code = "BAD_REQUEST";
    message = message ?? "Bad Request";

    super({ code, message, status });
  }
}
