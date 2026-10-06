import { Inject, SingletonProto } from '@eggjs/tegg';
import { type MainRunner, Runner } from '@eggjs/tegg/standalone';

import { InnerBar } from './innerBar.ts';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<string> {
  @Inject()
  innerBar: InnerBar;

  async main(): Promise<string> {
    return this.innerBar.message();
  }
}
