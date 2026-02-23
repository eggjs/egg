import { SingletonProto, AccessLevel } from '@eggjs/core-decorator';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class UserService {
  async find(id: string): Promise<{ id: string; name: string }> {
    return { id, name: 'user' };
  }
}
