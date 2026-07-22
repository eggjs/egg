import { ContextProto } from '@eggjs/tegg';

@ContextProto()
export class HelloService {
  hello(name: string): string {
    return `hello, ${name}`;
  }
}
