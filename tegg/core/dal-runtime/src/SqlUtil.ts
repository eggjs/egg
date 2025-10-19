function isWhiteChar(ch: string) {
  return ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t';
}

const COMMENT_CHARS = '-#/';
const MUL_CHAR_LEADING_COMMENT_FIRST_CHAR = {
  MAY_BE_FIRST_COMMENT: '-',
  MAY_BE_FIRST_BLOCK_COMMENT: '/',
};
const MUL_CHAR_LEADING_COMMENT_VERIFIER = {
  MAY_BE_FIRST_COMMENT: '-',
  MAY_BE_FIRST_BLOCK_COMMENT: '*',
};
const MUL_CHAR_LEADING_COMMENT_NEXT_STATE = {
  MAY_BE_FIRST_COMMENT: 'IN_COMMENT_WAIT_HINT',
  MAY_BE_FIRST_BLOCK_COMMENT: 'IN_BLOCK_COMMENT_WAIT_HINT',
};

export class SqlUtil {
  static minify(sql: string): string {
    let ret = '';

    let state = 'START';
    let tempNextState;
    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      switch (state) {
        case 'MAY_BE_FIRST_COMMENT':
        case 'MAY_BE_FIRST_BLOCK_COMMENT':
          switch (ch) {
            case '"':
              tempNextState = 'DOUBLE_QUOTE';
              break;
            case "'":
              tempNextState = 'SINGLE_QUOTE';
              break;
            case MUL_CHAR_LEADING_COMMENT_VERIFIER[state]:
              tempNextState = MUL_CHAR_LEADING_COMMENT_NEXT_STATE[state];
              break;
            default:
              tempNextState = 'CONTENT';
              break;
          }
          if (ch !== MUL_CHAR_LEADING_COMMENT_VERIFIER[state]) {
            ret += `${MUL_CHAR_LEADING_COMMENT_FIRST_CHAR[state]}${ch}`;
          }
          state = tempNextState;
          break;

        case 'IN_COMMENT_WAIT_HINT':
          if (ch !== '+') {
            state = 'IN_COMMENT';
          } else {
            state = 'IN_COMMENT_HINT';
            ret += '--+';
          }
          break;

        case 'IN_BLOCK_COMMENT_WAIT_HINT':
          if (ch !== '+') {
            state = 'IN_BLOCK_COMMENT';
          } else {
            state = 'IN_BLOCK_COMMENT_HINT';
            ret += '/*+';
          }
          break;

        case 'MAY_BE_LAST_BLOCK_COMMENT':
          if (ch === '/') {
            if (ret && !isWhiteChar(ret[ret.length - 1])) ret += ' ';
            state = 'IN_SPACE';
          } else {
            state = 'IN_BLOCK_COMMENT';
          }
          break;

        case 'MAY_BE_LAST_BLOCK_COMMENT_HINT':
          ret += ch;
          if (ch === '/') {
            state = 'IN_SPACE';
            if (isWhiteChar(sql[i + 1])) ret += sql[i + 1];
          } else {
            state = 'IN_BLOCK_COMMENT_HINT';
          }
          break;

        case 'IN_COMMENT':
          if (ch === '\n' || ch === '\r') {
            if (ret && !isWhiteChar(ret[ret.length - 1])) ret += ' ';
            state = 'IN_SPACE';
          }
          break;

        case 'IN_COMMENT_HINT':
          ret += ch;
          if (ch === '\n' || ch === '\r') {
            state = 'IN_SPACE';
          }
          break;

        case 'IN_BLOCK_COMMENT':
          if (ch === '*') {
            state = 'MAY_BE_LAST_BLOCK_COMMENT';
          }
          break;

        case 'IN_BLOCK_COMMENT_HINT':
          ret += ch;
          if (ch === '*') {
            state = 'MAY_BE_LAST_BLOCK_COMMENT_HINT';
          }
          break;

        case 'START':
          if (isWhiteChar(ch)) continue;
          switch (ch) {
            case '"':
              state = 'DOUBLE_QUOTE';
              break;
            case "'":
              state = 'SINGLE_QUOTE';
              break;
            case '-':
              state = 'MAY_BE_FIRST_COMMENT';
              break;
            case '#':
              state = 'IN_COMMENT';
              break;
            case '/':
              state = 'MAY_BE_FIRST_BLOCK_COMMENT';
              break;
            default:
              state = 'CONTENT';
              break;
          }
          if (!COMMENT_CHARS.includes(ch)) ret += ch;
          break;

        case 'DOUBLE_QUOTE':
        case 'SINGLE_QUOTE':
          switch (ch) {
            case '\\':
              state = `BACKSLASH_AFTER_${state}`;
              break;
            case "'":
              if (state === 'SINGLE_QUOTE') {
                state = 'QUOTE_DONE';
              }
              break;
            case '"':
              if (state === 'DOUBLE_QUOTE') {
                state = 'QUOTE_DONE';
              }
              break;
            default:
              break;
          }
          ret += ch;
          break;

        case 'BACKSLASH_AFTER_SINGLE_QUOTE':
        case 'BACKSLASH_AFTER_DOUBLE_QUOTE':
          ret += ch;
          state = state.substr(16);
          break;

        case 'QUOTE_DONE':
        case 'CONTENT':
          switch (ch) {
            case "'":
              state = 'SINGLE_QUOTE';
              break;
            case '"':
              state = 'DOUBLE_QUOTE';
              break;
            case '-':
              state = 'MAY_BE_FIRST_COMMENT';
              break;
            case '#':
              state = 'IN_COMMENT';
              break;
            case '/':
              state = 'MAY_BE_FIRST_BLOCK_COMMENT';
              break;
            default:
              if (isWhiteChar(ch)) {
                state = 'IN_SPACE';
                ret += ' ';
                continue;
              }
              state = 'CONTENT';
          }
          if (!COMMENT_CHARS.includes(ch)) ret += ch;
          break;

        case 'IN_SPACE':
          switch (ch) {
            case "'":
              state = 'SINGLE_QUOTE';
              break;
            case '"':
              state = 'DOUBLE_QUOTE';
              break;
            case '-':
              state = 'MAY_BE_FIRST_COMMENT';
              break;
            case '#':
              state = 'IN_COMMENT';
              break;
            case '/':
              state = 'MAY_BE_FIRST_BLOCK_COMMENT';
              break;
            default:
              if (isWhiteChar(ch)) continue;
              state = 'CONTENT';
          }
          if (!COMMENT_CHARS.includes(ch)) ret += ch;
          break;

        default:
          throw new Error('Unexpected state machine while minifying SQL.');
      }
    }

    return ret.trim();
  }
}
