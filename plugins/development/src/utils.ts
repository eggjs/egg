export function isTimingFile(file: string) {
  return /^(agent|application)_timing/.test(file);
}
