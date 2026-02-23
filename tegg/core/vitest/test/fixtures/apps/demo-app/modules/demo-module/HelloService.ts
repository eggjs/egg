import { AccessLevel, ContextProto } from '@eggjs/core-decorator';

@ContextProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloService {
  sayHi(name: string) {
    return `hi ${name}`;
  }
}
