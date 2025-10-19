import { AccessLevel, ContextProto, SingletonProto } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'logger',
})
export class MockLogger {
  constructor() {
    const methods = Object.keys(console);
    for (const method of methods) {
      // @ts-expect-error console is not typed
      this[method] = (...args) => {
        // @ts-expect-error console is not typed
        console[method](...args);
      };
    }
  }
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
  name: 'logger',
})
export class MockContextLogger {
  constructor() {
    const methods = Object.keys(console);
    for (const method of methods) {
      // @ts-expect-error console is not typed
      this[method] = (...args) => {
        // @ts-expect-error console is not typed
        console[method](...args);
      };
    }
  }
}
