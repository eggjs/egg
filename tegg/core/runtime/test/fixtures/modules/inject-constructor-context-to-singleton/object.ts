import { AccessLevel } from '@eggjs/tegg-types';
import { ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextFooDepth2 {
  async hello() {
    return 'hello from depth2';
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonConstructorBarDepth3 {
  constructor(@Inject() readonly contextFooDepth2: ContextFooDepth2) {}

  async hello() {
    return this.contextFooDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonBarConstructorDepth2 {
  constructor(@Inject() readonly singletonConstructorBarDepth3: SingletonConstructorBarDepth3) {}

  async hello() {
    return this.singletonConstructorBarDepth3.hello();
  }
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextConstructorFoo {
  constructor(@Inject() readonly singletonBarConstructorDepth2: SingletonBarConstructorDepth2) {}

  async hello() {
    return this.singletonBarConstructorDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonConstructorBar {
  constructor(@Inject() readonly contextConstructorFoo: ContextConstructorFoo) {}

  async hello() {
    return this.contextConstructorFoo.hello();
  }
}
