import { SingletonProto } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';
import { ContextHandler } from '@eggjs/tegg-runtime';

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
