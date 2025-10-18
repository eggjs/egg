function prepareObjectStackTrace(_: Error, stack: NodeJS.CallSite[]) {
  return stack;
}

export function getCalleeFromStack(withLine: boolean, stackIndex?: number) {
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
    fileName = callSite.getFileName();
    /* istanbul ignore if */
    if (fileName && fileName.endsWith('egg-mock/lib/app.js')) {
      // TODO: add test
      callSite = obj.stack[stackIndex + 1];
      fileName = callSite.getFileName();
    }
  }

  Error.prepareStackTrace = prep;
  Error.stackTraceLimit = limit;

  /* istanbul ignore if */
  if (!callSite || !fileName) return '<anonymous>';
  if (!withLine) return fileName;
  return `${fileName}:${callSite.getLineNumber()}:${callSite.getColumnNumber()}`;
}
