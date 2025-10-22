import { fileURLToPath } from 'node:url';
import { debuglog } from 'node:util';

const debug = debuglog('egg/tegg/core/common-util/StackUtil');

/**
 * Capture call site stack from v8.
 * https://github.com/v8/v8/wiki/Stack-Trace-API
 */

function prepareObjectStackTrace(_: Error, stack: NodeJS.CallSite[]) {
  return stack;
}

export class StackUtil {
  // from egg-core/utils
  // https://github.com/eggjs/core/blob/5.x/lib/utils/index.js#L51
  static getCalleeFromStack(withLine: boolean, stackIndex?: number): string {
    stackIndex = stackIndex === undefined ? 2 : stackIndex;
    const limit = Error.stackTraceLimit;
    const prep = Error.prepareStackTrace;

    Error.prepareStackTrace = prepareObjectStackTrace;
    Error.stackTraceLimit = 10;

    // capture the stack
    const obj: { stack: NodeJS.CallSite[] } = {
      stack: [],
    };
    Error.captureStackTrace(obj);
    if (debug.enabled) {
      debug(
        'call stack: \n------------------------------------------\n%s\n------------------------------------------',
        obj.stack.map((callSite) => callSite.getFileName() ?? '<anonymous>').join('\n'),
      );
    }
    let callSite = obj.stack[stackIndex];
    // skip the @oxc-project/runtime/src/helpers/decorate.js stack frame
    // node_modules/.pnpm/@oxc-project+runtime@0.92.0/node_modules/@oxc-project/runtime/src/helpers/decorate.js
    if (callSite) {
      const fileName = callSite.getFileName() ?? '';
      if (fileName.includes('/@oxc-project/runtime/') || fileName.includes('\\@oxc-project\\runtime\\')) {
        callSite = obj.stack[stackIndex + 1];
      }
    }

    let fileName: string | null = null;
    if (callSite) {
      // egg-mock will create a proxy
      // https://github.com/eggjs/egg-mock/blob/master/lib/app.js#L174
      fileName = callSite.getFileName();
      if (fileName?.startsWith('file://')) {
        // remove file://
        fileName = fileURLToPath(fileName);
      }
    }

    Error.prepareStackTrace = prep;
    Error.stackTraceLimit = limit;

    /* istanbul ignore if */
    if (!callSite || !fileName) return '<anonymous>';
    if (!withLine) return fileName;
    return `${fileName}:${callSite.getLineNumber()}:${callSite.getColumnNumber()}`;
  }
}
