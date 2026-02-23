import { SingletonProto, AccessLevel } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class OrderService {
  async find(id: string): Promise<{ id: string; amount: number }> {
    return { id, amount: 100 };
  }
}
