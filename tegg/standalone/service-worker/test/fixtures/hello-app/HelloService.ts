import { AccessLevel, SingletonProto } from '@eggjs/tegg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class HelloService {
  hello(name: string): string {
    return `hello, ${name}`;
  }
}
