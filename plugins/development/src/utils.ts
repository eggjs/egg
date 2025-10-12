export function isTimingFile(file: string): boolean {
  return /^(agent|application)_timing/.test(file);
}
