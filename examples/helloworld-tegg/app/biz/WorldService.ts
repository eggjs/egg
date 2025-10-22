import { SingletonProto } from 'egg';

@SingletonProto({
  name: 'worldInterface',
})
export class WorldService {
  async world(): Promise<string> {
    return 'world!';
  }
}
