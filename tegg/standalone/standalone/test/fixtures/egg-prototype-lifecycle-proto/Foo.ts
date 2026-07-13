import { SingletonProto } from '@eggjs/tegg';
import { type MainRunner, Runner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto({ name: 'FooRunner' })
export class Foo implements MainRunner<string> {
  static message: string;

  async main(): Promise<string> {
    return Foo.message;
  }
}
