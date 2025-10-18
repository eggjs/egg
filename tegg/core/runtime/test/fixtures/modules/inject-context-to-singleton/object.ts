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
export class SingletonBarDepth3 {
  @Inject()
  contextFooDepth2: ContextFooDepth2;

  async hello() {
    return this.contextFooDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonBarDepth2 {
  @Inject()
  singletonBarDepth3: SingletonBarDepth3;

  async hello() {
    return this.singletonBarDepth3.hello();
  }
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextFoo {
  @Inject()
  private readonly singletonBarDepth2: SingletonBarDepth2;

  async hello() {
    return this.singletonBarDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonBar {
  @Inject()
  foo: ContextFoo;

  async hello() {
    return this.foo.hello();
  }
}
