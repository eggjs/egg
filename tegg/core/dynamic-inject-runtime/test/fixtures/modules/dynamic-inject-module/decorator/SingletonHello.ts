import { type ImplDecorator, QualifierImplDecoratorUtil } from '@eggjs/dynamic-inject';

import { AbstractSingletonHello } from '../AbstractSingletonHello.ts';
import { SingletonHelloType } from '../FooType.ts';

export const SINGLETON_HELLO_ATTRIBUTE = 'SINGLETON_HELLO_ATTRIBUTE';

export const SingletonHello: ImplDecorator<AbstractSingletonHello, typeof SingletonHelloType> =
  QualifierImplDecoratorUtil.generatorDecorator(AbstractSingletonHello, SINGLETON_HELLO_ATTRIBUTE);
