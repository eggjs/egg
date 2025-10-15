import { HttpError } from "./http_error.ts";

export class PreconditionRequiredError extends HttpError {
  constructor(message?: string) {
    const status = 428;
    const code = "PRECONDITION_REQUIRED";
    message = message ?? "Precondition Required";

    super({ code, message, status });
  }
}
