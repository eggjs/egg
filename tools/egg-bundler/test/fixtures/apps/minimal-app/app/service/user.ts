import { Service } from 'egg';

export default class UserService extends Service {
  async getUser(id: string): Promise<{ id: string; name: string }> {
    return { id, name: `user-${id}` };
  }
}
