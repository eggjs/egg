const BASIC_ALPHABETS = new Set('#&;`|*?~<>^()[]{}$;\'",\x0A\xFF'.split(''));

export default function escapeShellCmd(text: string) {
  const str = '' + text;
  let res = '';
  let ascii;

  for (let index = 0; index < str.length; index++) {
    ascii = str[index];
    if (!BASIC_ALPHABETS.has(ascii)) {
      res += ascii;
    }
  }

  return res;
}
