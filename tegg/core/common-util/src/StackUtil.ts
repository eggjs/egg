import { fileURLToPath } from 'node:url';
import { debuglog } from 'node:util';

const debug = debuglog('@eggjs/tegg-common-util/StackUtil');

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
  static getCalleeFromStack(withLine: boolean, stackIndex?: number) {
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
      debug('call stack: %o', obj.stack.map(callSite => callSite.getFileName() ?? '<anonymous>').join('\n'));
    }
    const callSite = obj.stack[stackIndex];
    let fileName: string | undefined;
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
