/**
 * Escape JavaScript to \xHH format
 */

// escape \x00-\x7f
// except 0-9,A-Z,a-z(\x2f-\x3a \x40-\x5b \x60-\x7b)

// eslint-disable-next-line
const MATCH_VULNERABLE_REGEXP = /[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]/;
// eslint-enable-next-line

const BASIC_ALPHABETS = new Set('abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));

const map: Record<string, string> = {
  '\t': '\\t',
  '\n': '\\n',
  '\r': '\\r',
};

export default function escapeJavaScript(text: string) {
  const str = '' + text;
  const match = MATCH_VULNERABLE_REGEXP.exec(str);

  if (!match) {
    return str;
  }

  let res = '';
  let index = 0;
  let lastIndex = 0;
  let ascii;

  for (index = match.index; index < str.length; index++) {
    ascii = str[index];
    if (BASIC_ALPHABETS.has(ascii)) {
      continue;
    } else {
      if (map[ascii] === undefined) {
        const code = ascii.charCodeAt(0);
        if (code > 127) {
          continue;
        } else {
          map[ascii] = '\\x' + code.toString(16);
        }
      }
    }

    if (lastIndex !== index) {
      res += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    res += map[ascii];
  }

  return lastIndex !== index ? res + str.substring(lastIndex, index) : res;
}
