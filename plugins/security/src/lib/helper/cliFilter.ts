/**
 * remote command execution
 */

const BASIC_ALPHABETS = new Set('abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.-_'.split(''));

export default function cliFilter(text: string) {
  const str = '' + text;
  let res = '';
  let ascii;

  for (let index = 0; index < str.length; index++) {
    ascii = str[index];
    if (BASIC_ALPHABETS.has(ascii)) {
      res += ascii;
    }
  }

  return res;
}
