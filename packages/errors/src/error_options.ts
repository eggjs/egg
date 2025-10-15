import type { ErrorType } from "./error_type.ts";

export interface ErrorOptions {
  code?: string;
  errorType?: ErrorType;
  message: string;
  [key: string]: any;
}
