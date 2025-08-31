export class ImportResolveError extends Error {
  filepath: string;
  paths: string[];

  constructor(filepath: string, paths: string[], error: Error) {
    const message = `${error.message}, paths: ${JSON.stringify(paths)}`;
    super(message, { cause: error });
    this.name = this.constructor.name;
    this.filepath = filepath;
    this.paths = paths;
    Error.captureStackTrace(this, this.constructor);
  }
}
