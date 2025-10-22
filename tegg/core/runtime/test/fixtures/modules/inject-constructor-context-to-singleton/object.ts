import { AccessLevel } from '@eggjs/tegg-types';
import { ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextFooDepth2 {
  async hello(): Promise<string> {
    return 'hello from depth2';
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonConstructorBarDepth3 {
  // @ts-expect-error: readonly property in constructor
  constructor(@Inject() readonly contextFooDepth2: ContextFooDepth2) {}

  async hello(): Promise<string> {
    return this.contextFooDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonBarConstructorDepth2 {
  // @ts-expect-error: readonly property in constructor
  constructor(
    @Inject()
    readonly singletonConstructorBarDepth3: SingletonConstructorBarDepth3,
  ) {}

  async hello(): Promise<string> {
    return this.singletonConstructorBarDepth3.hello();
  }
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextConstructorFoo {
  // @ts-expect-error: readonly property in constructor
  constructor(
    @Inject()
    readonly singletonBarConstructorDepth2: SingletonBarConstructorDepth2,
  ) {}

  async hello(): Promise<string> {
    return this.singletonBarConstructorDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonConstructorBar {
  // @ts-expect-error: readonly property in constructor
  constructor(@Inject() readonly contextConstructorFoo: ContextConstructorFoo) {}

  async hello(): Promise<string> {
    return this.contextConstructorFoo.hello();
  }
}
