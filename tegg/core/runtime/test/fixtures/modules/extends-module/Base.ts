import { ContextProto, Inject } from '@eggjs/core-decorator';

@ContextProto()
export class Logger {}

@ContextProto()
export class Base {
  @Inject()
  logger: Logger;
}

@ContextProto()
export class Foo extends Base {}

@ContextProto()
export class Bar extends Base {
  @Inject()
  foo: Foo;
}
