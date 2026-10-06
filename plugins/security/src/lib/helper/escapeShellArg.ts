export default function escapeShellArg(text: string): string {
  const str = '' + text;
  return "'" + str.replace(/'/g, "'\\''") + "'";
}
