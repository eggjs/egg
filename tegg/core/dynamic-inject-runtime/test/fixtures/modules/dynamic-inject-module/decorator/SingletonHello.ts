import { type ImplDecorator, QualifierImplDecoratorUtil } from '@eggjs/tegg-dynamic-inject';

import { SingletonHelloType } from '../FooType.ts';
import { AbstractSingletonHello } from '../AbstractSingletonHello.ts';

export const SINGLETON_HELLO_ATTRIBUTE = 'SINGLETON_HELLO_ATTRIBUTE';

export const SingletonHello: ImplDecorator<AbstractSingletonHello, typeof SingletonHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractSingletonHello, SINGLETON_HELLO_ATTRIBUTE);
