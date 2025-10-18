import { Inject, SingletonProto } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

export interface Hello {
  hello(): string;
}

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string> {
  @Inject()
  hello: Hello;

  async main(): Promise<string> {
    return this.hello.hello();
  }
}
