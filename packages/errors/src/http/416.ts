import { HttpError } from "./http_error.ts";

export class RangeNotSatisfiableError extends HttpError {
  constructor(message?: string) {
    const status = 416;
    const code = "RANGE_NOT_SATISFIABLE";
    message = message ?? "Range Not Satisfiable";

    super({ code, message, status });
  }
}
