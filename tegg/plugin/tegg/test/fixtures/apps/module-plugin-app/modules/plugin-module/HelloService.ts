import { AccessLevel, Inject, SingletonProto } from '@eggjs/tegg';

import { InnerRegistry } from './InnerRegistry.ts';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloService {
  @Inject()
  innerRegistry: InnerRegistry;

  message: string;

  hello(): { message: string; createdLoadUnits: string[] } {
    return {
      message: this.message,
      createdLoadUnits: [...this.innerRegistry.createdLoadUnits],
    };
  }
}
