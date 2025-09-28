export class MultipartFileTooLargeError extends Error {
  status: number;
  fields: Record<string, any>;
  filename: string;

  constructor(message: string, fields: Record<string, any>, filename: string) {
    super(message);
    this.name = this.constructor.name;
    this.status = 413;
    this.fields = fields;
    this.filename = filename;
    Error.captureStackTrace(this, this.constructor);
  }
}
