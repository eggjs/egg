/**
 * This method needs to reside in its own module in order to properly test stack trace handling.
 */
export function throwError(message: string) {
  return function() {
    throw new Error(message);
  };
}
