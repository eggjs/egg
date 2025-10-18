import { ContextProto, Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

@SingletonProto()
export class Hello {
  hello() {
    return 'hello!';
  }
}

@ContextProto()
export class HelloContext {
  hello() {
    return 'hello from ctx';
  }
}

// @ContextProto()
@SingletonProto()
@Runner()
export class Foo implements MainRunner<string> {
  @Inject()
  hello: Hello;

  @Inject()
  helloContext: HelloContext;

  async main(): Promise<string> {
    return this.hello.hello() + this.helloContext.hello();
  }
}
