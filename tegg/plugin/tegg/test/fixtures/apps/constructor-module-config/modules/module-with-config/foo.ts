import { AccessLevel, Inject, SingletonProto } from '@eggjs/tegg';
import { EggLogger } from 'egg-logger';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class Foo {
  readonly foo: string;
  readonly bar: string;

  constructor(
    @Inject() moduleConfig: Record<string, any>,
    @Inject() readonly logger: EggLogger
  ) {
    this.foo = moduleConfig.features.dynamic.foo;
    this.bar = moduleConfig.features.dynamic.bar;
  }

  log() {
    this.logger.info('foo');
  }
}
