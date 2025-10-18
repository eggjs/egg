import { ContextProto, Inject } from '@eggjs/core-decorator';

@ContextProto()
export class Logger {}

@ContextProto()
export class Bar {}

@ContextProto()
export class ConstructorBase {
  constructor(@Inject() readonly logger: Logger) {}
}

@ContextProto()
export class FooConstructor extends ConstructorBase {
  constructor(@Inject() readonly bar: Bar) {
    super(console);
  }
}

@ContextProto()
export class FooConstructorLogger extends ConstructorBase {
  constructor(
    @Inject() readonly bar: Bar,
    @Inject() readonly logger: Logger
  ) {
    super(logger);
  }
}
