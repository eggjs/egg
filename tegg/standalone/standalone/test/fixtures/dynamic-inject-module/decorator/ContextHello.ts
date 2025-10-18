import { type ImplDecorator, QualifierImplDecoratorUtil } from '@eggjs/tegg';

import { ContextHelloType } from '../FooType.ts';
import { AbstractContextHello } from '../AbstractContextHello.ts';

export const CONTEXT_HELLO_ATTRIBUTE = 'CONTEXT_HELLO_ATTRIBUTE';

export const ContextHello: ImplDecorator<AbstractContextHello, typeof ContextHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractContextHello, CONTEXT_HELLO_ATTRIBUTE);
