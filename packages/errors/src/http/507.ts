import { HttpError } from "./http_error.ts";

export class InsufficientStorageError extends HttpError {
  constructor(message?: string) {
    const status = 507;
    const code = "INSUFFICIENT_STORAGE";
    message = message ?? "Insufficient Storage";

    super({ code, message, status });
  }
}
