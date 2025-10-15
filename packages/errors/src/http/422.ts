import { HttpError } from "./http_error.ts";

export class UnprocessableEntityError extends HttpError {
  constructor(message?: string) {
    const status = 422;
    const code = "UNPROCESSABLE_ENTITY";
    message = message ?? "Unprocessable Entity";

    super({ code, message, status });
  }
}
