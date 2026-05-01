import { AccessLevel, SingletonProto } from '@eggjs/tegg';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class FooService {
  hello(name: string): string {
    return `hello, ${name}`;
  }
}
