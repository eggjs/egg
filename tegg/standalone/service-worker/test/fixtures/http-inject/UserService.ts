import { SingletonProto, AccessLevel } from '@eggjs/tegg';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class UserService {
  async findById(id: string) {
    return {
      id,
      name: `user-${id}`,
    };
  }

  async list() {
    return [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ];
  }
}
