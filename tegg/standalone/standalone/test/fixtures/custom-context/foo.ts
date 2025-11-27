import { SingletonProto } from '@eggjs/tegg';
import { ContextHandler } from '@eggjs/tegg-runtime';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

export interface Hello {
  hello(): string;
}

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string> {
  async main(): Promise<string> {
    const ctx = ContextHandler.getContext();
    return ctx?.get('foo');
  }
}
