import { SingletonProto } from '@eggjs/tegg';
import { ContextHandler } from '@eggjs/tegg/helper';
import { type MainRunner, Runner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string> {
  async main(): Promise<string> {
    return ContextHandler.getContext()?.get('initialized');
  }
}
