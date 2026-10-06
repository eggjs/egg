import os from 'node:os';

// A child killed by a signal reports code=null on exit; map it to the
// shell convention of 128 + signal number so it does not read as success.
export function toExitCode(code: number | null, signal: NodeJS.Signals | null): number {
  if (code !== null) return code;
  const signalNumber = signal ? os.constants.signals[signal] : undefined;
  return signalNumber ? 128 + signalNumber : 1;
}
