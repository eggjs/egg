import { HttpError } from "./http_error.ts";

export class UnavailableForLegalReasonsError extends HttpError {
  constructor(message?: string) {
    const status = 451;
    const code = "UNAVAILABLE_FOR_LEGAL_REASONS";
    message = message ?? "Unavailable For Legal Reasons";

    super({ code, message, status });
  }
}
