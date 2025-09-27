export default function escapeShellArg(text: string) {
  const str = '' + text;
  return "'" + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}
