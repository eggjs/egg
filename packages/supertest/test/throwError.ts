/**
 * This method needs to reside in its own module in order to properly test stack trace handling.
 */
export function throwError(message: string): () => never {
  return function (): never {
    throw new Error(message);
  };
}
