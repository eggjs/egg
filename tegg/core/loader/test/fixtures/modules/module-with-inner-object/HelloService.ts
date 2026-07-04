import { SingletonProto } from '@eggjs/core-decorator';

@SingletonProto()
export class HelloService {
  hello(): string {
    return 'hello';
  }
}
