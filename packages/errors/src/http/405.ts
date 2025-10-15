import { HttpError } from "./http_error.ts";

export class MethodNotAllowedError extends HttpError {
  constructor(message?: string) {
    const status = 405;
    const code = "METHOD_NOT_ALLOWED";
    message = message ?? "Method Not Allowed";

    super({ code, message, status });
  }
}
