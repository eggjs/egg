import { type ErrorObject } from 'ajv/dist/2019.js';

export interface AjvInvalidParamErrorOptions {
  errorData: unknown;
  currentSchema: string;
  errors: ErrorObject[];
}

export class AjvInvalidParamError extends Error {
  errorData: unknown;
  currentSchema: string;
  errors: ErrorObject[];

  constructor(message: string, options: AjvInvalidParamErrorOptions) {
    super(message);
    this.name = this.constructor.name;
    this.errorData = options.errorData;
    this.currentSchema = options.currentSchema;
    this.errors = options.errors;
  }
}
