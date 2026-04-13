import { fileURLToPath } from 'node:url';
import util, { type CallSiteObject } from 'node:util';

const debug = util.debuglog('egg/tegg/core/common-util/StackUtil');

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
  /**
   * Get the callee file path from the stack.
   * @param withLine - Whether to include the line number and column number in the result. Default is false.
   * @param stackIndex - The index of the stack frame to get. Default is 2.
   * @returns The callee file path from the stack.
   */
  static getCalleeFromStack(withLine?: boolean, stackIndex?: number): string {
    withLine = withLine ?? false;
    stackIndex = stackIndex ?? 2;
    const frameCount = 10;
    let stacks: CallSiteObject[] = [];
    if (typeof util.getCallSites === 'function') {
      stacks = util.getCallSites(frameCount);
    } else {
      stacks = [];
      // capture the stack with raw Error.stackTraceLimit and Error.prepareStackTrace
      const rawStackTraceLimit = Error.stackTraceLimit;
      const rawPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = prepareObjectStackTrace;
      Error.stackTraceLimit = frameCount;
      const obj: { stack: NodeJS.CallSite[] } = {
        stack: [],
      };
      Error.captureStackTrace(obj);
      for (let callSite of obj.stack) {
        stacks.push({
          scriptName: callSite.getFileName() ?? '',
          scriptId: callSite.getScriptHash() ?? '',
          lineNumber: callSite.getLineNumber() ?? 1,
          columnNumber: callSite.getColumnNumber() ?? 1,
          functionName: callSite.getFunctionName() ?? '',
        });
      }
      // restore the original Error.stackTraceLimit and Error.prepareStackTrace
      // must restore after the stack is captured
      Error.prepareStackTrace = rawPrepareStackTrace;
      Error.stackTraceLimit = rawStackTraceLimit;
    }

    if (debug.enabled) {
      debug(
        'util.getCallSites stack: \n------------------------------------------\n%s\n------------------------------------------',
        stacks
          .map((callSite) => {
            const fileName = callSite.scriptName ?? '<anonymous>';
            const lineNumber = callSite.lineNumber ?? '<unknown>';
            const columnNumber = callSite.columnNumber ?? '<unknown>';
            const functionName = callSite.functionName;
            return `${fileName}:${lineNumber}:${columnNumber}:${functionName ? `${functionName}()` : '<anonymous>'}`;
          })
          .join('\n'),
      );
    }
    let callSite = stacks[stackIndex];
    // skip the @oxc-project/runtime/src/helpers/decorate.js stack frame
    // - filesystem path: node_modules/.pnpm/@oxc-project+runtime@0.92.0/node_modules/@oxc-project/runtime/src/helpers/decorate.js
    // - vite/rolldown virtual module id: \x00@oxc-project+runtime@0.122.0/helpers/decorate.js
    if (callSite) {
      const fileName = callSite.scriptName;
      if (
        fileName.includes('/@oxc-project/runtime/') ||
        fileName.includes('\\@oxc-project\\runtime\\') ||
        fileName.includes('@oxc-project+runtime@')
      ) {
        callSite = stacks[stackIndex + 1];
      }
    }

    let fileName = '';
    if (callSite) {
      // egg-mock will create a proxy
      // https://github.com/eggjs/egg-mock/blob/master/lib/app.js#L174
      fileName = callSite.scriptName;
      if (fileName?.startsWith('file://')) {
        // remove file://
        fileName = fileURLToPath(fileName);
      }
    }

    if (!callSite || !fileName) {
      return '<anonymous>';
    }
    if (!withLine) {
      return fileName;
    }
    return `${fileName}:${callSite.lineNumber}:${callSite.columnNumber}`;
  }
}
