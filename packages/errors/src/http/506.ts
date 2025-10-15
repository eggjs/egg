import { HttpError } from "./http_error.ts";

export class VariantAlsoNegotiatesError extends HttpError {
  constructor(message?: string) {
    const status = 506;
    const code = "VARIANT_ALSO_NEGOTIATES";
    message = message ?? "Variant Also Negotiates";

    super({ code, message, status });
  }
}
