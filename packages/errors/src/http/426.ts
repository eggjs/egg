import { HttpError } from "./http_error.ts";

export class UpgradeRequiredError extends HttpError {
  constructor(message?: string) {
    const status = 426;
    const code = "UPGRADE_REQUIRED";
    message = message ?? "Upgrade Required";

    super({ code, message, status });
  }
}
