import { SingletonProto } from 'egg';

@SingletonProto()
export class HelloService {
  async hello(): Promise<string> {
    return 'hello';
  }
}
