import { ContextProto, Inject, SingletonProto } from '@eggjs/core-decorator';

@ContextProto()
export class Logger {}

@SingletonProto()
export class Base {
  @Inject()
  logger: Logger;
}
