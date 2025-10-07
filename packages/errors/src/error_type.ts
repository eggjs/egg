const ErrorType = {
  /**
   * Built-in Error
   */
  BUILTIN: 'BUILTIN',
  /**
   * Egg Error
   */
  ERROR: 'ERROR',
  /**
   * Egg Exception
   */
  EXCEPTION: 'EXCEPTION',
} as const;

type ErrorType = (typeof ErrorType)[keyof typeof ErrorType];

export { ErrorType };
