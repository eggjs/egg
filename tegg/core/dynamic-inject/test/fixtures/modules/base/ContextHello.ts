import { ImplDecorator, QualifierImplDecoratorUtil } from '../../../../src/index.js';
import { AbstractContextHello } from './AbstractContextHello.js';
import { ContextHelloType } from './FooType.js';

export const CONTEXT_HELLO_ATTRIBUTE = 'CONTEXT_HELLO_ATTRIBUTE';

export const ContextHello: ImplDecorator<AbstractContextHello, typeof ContextHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractContextHello, CONTEXT_HELLO_ATTRIBUTE);
