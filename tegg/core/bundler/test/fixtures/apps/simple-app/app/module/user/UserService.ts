import { SingletonProto, AccessLevel } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class UserService {
  async getUser(id: string): Promise<{ id: string; name: string }> {
    return { id, name: 'test user' };
  }

  async listUsers(): Promise<Array<{ id: string; name: string }>> {
    return [{ id: '1', name: 'user1' }];
  }
}
