import { Inject, InjectOptional, SingletonProto } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

import { Bar } from './bar.ts';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<boolean> {
  @Inject({ optional: true })
  hello?: object;

  @InjectOptional()
  world?: object;

  @Inject()
  bar: Bar;

  async main(): Promise<boolean> {
    return !this.hello && !this.world && !this.bar.hello && !this.bar.world;
  }
}
