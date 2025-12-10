function prepareObjectStackTrace(_: Error, stack: NodeJS.CallSite[]) {
  return stack;
}

export function getCalleeFromStack(withLine: boolean, stackIndex?: number): string {
  stackIndex = stackIndex === undefined ? 2 : stackIndex;
  const limit = Error.stackTraceLimit;
  const prep = Error.prepareStackTrace;

  Error.prepareStackTrace = prepareObjectStackTrace;
  Error.stackTraceLimit = 5;

  // capture the stack
  const obj: any = {};
  Error.captureStackTrace(obj);
  let callSite = obj.stack[stackIndex];
  let fileName;
  /* istanbul ignore else */
  if (callSite) {
    // egg-mock will create a proxy
    // https://github.com/eggjs/egg-mock/blob/master/lib/app.js#L174
    fileName = typeof callSite.getFileName === 'function' ? callSite.getFileName() : '';
    /* istanbul ignore if */
    if (fileName && fileName.endsWith('egg-mock/lib/app.js')) {
      // TODO: add test
      callSite = obj.stack[stackIndex + 1];
      fileName = typeof callSite.getFileName === 'function' ? callSite.getFileName() : '';
    }
  }

  Error.prepareStackTrace = prep;
  Error.stackTraceLimit = limit;

  /* istanbul ignore if */
  if (!callSite || !fileName) return '<anonymous>';
  if (!withLine) return fileName;
  const lineNumber = typeof callSite.getLineNumber === 'function' ? callSite.getLineNumber() : 0;
  const columnNumber = typeof callSite.getColumnNumber === 'function' ? callSite.getColumnNumber() : 0;
  return `${fileName}:${lineNumber}:${columnNumber}`;
}
