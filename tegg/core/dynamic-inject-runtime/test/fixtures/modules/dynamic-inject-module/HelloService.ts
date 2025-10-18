import { ContextProto, Inject } from '@eggjs/core-decorator';
import { type EggObjectFactory } from '@eggjs/tegg-dynamic-inject';

import { AbstractContextHello } from './AbstractContextHello.js';
import { AbstractSingletonHello } from './AbstractSingletonHello.js';
import { ContextHelloType, SingletonHelloType } from './FooType.js';

@ContextProto()
export class HelloService {
  @Inject()
  private readonly eggObjectFactory: EggObjectFactory;

  async hello(): Promise<string[]> {
    const helloImpls = await Promise.all([
      this.eggObjectFactory.getEggObject(AbstractContextHello, ContextHelloType.FOO),
      this.eggObjectFactory.getEggObject(AbstractContextHello, ContextHelloType.BAR),
      this.eggObjectFactory.getEggObject(AbstractSingletonHello, SingletonHelloType.FOO),
      this.eggObjectFactory.getEggObject(AbstractSingletonHello, SingletonHelloType.BAR),
    ]);
    const msgs = helloImpls.map(helloImpl => helloImpl.hello());
    return msgs;
  }

  async sayHelloToAll(): Promise<string[]> {
    const singletonHellos = await this.eggObjectFactory.getEggObjects(AbstractSingletonHello);
    const contextHellos = await this.eggObjectFactory.getEggObjects(AbstractContextHello);

    const msgs: string[] = [];
    for await (const helloImpl of singletonHellos) {
      msgs.push(helloImpl.hello());
    }
    for await (const helloImpl of contextHellos) {
      msgs.push(helloImpl.hello());
    }

    return msgs;
  }
}
