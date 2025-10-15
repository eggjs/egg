import { HttpError } from "./http_error.ts";

export class ServiceUnavailableError extends HttpError {
  constructor(message?: string) {
    const status = 503;
    const code = "SERVICE_UNAVAILABLE";
    message = message ?? "Service Unavailable";

    super({ code, message, status });
  }
}
