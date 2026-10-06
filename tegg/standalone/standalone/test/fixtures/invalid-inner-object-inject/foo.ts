import { Inject, SingletonProto } from '@eggjs/tegg';
import { type MainRunner, Runner } from '@eggjs/tegg/standalone';

import { InnerBar } from './innerBar.ts';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<boolean> {
  @Inject()
  innerBar: InnerBar;

  async main(): Promise<boolean> {
    return !!this.innerBar;
  }
}
