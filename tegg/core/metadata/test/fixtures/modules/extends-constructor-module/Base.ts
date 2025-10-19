import { ContextProto, Inject } from '@eggjs/core-decorator';

@ContextProto()
export class Logger {}

@ContextProto()
export class Bar {}

@ContextProto()
export class ConstructorBase {
  // @ts-expect-error readonly property in constructor
  constructor(@Inject() readonly logger: Logger) {}
}

@ContextProto()
export class FooConstructor extends ConstructorBase {
  // @ts-expect-error readonly property in constructor
  constructor(@Inject() readonly bar: Bar) {
    super(console);
  }
}

@ContextProto()
export class FooConstructorLogger extends ConstructorBase {
  constructor(
    // @ts-expect-error readonly property in constructor
    @Inject() readonly bar: Bar,
    // @ts-expect-error readonly property in constructor
    @Inject() readonly logger: Logger
  ) {
    super(logger);
  }
}
