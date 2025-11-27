import { ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';

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
export class SingletonBarDepth3 {
  @Inject()
  contextFooDepth2: ContextFooDepth2;

  async hello(): Promise<string> {
    return this.contextFooDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonBarDepth2 {
  @Inject()
  singletonBarDepth3: SingletonBarDepth3;

  async hello(): Promise<string> {
    return this.singletonBarDepth3.hello();
  }
}

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ContextFoo {
  @Inject()
  private readonly singletonBarDepth2: SingletonBarDepth2;

  async hello(): Promise<string> {
    return this.singletonBarDepth2.hello();
  }
}

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class SingletonBar {
  @Inject()
  foo: ContextFoo;

  async hello(): Promise<string> {
    return this.foo.hello();
  }
}
