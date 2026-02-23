import { SingletonProto, AccessLevel, Inject } from '@eggjs/core-decorator';

import type { FooRepository } from './FooRepository.ts';

// PUBLIC - exposed to other modules (e.g. bar module's BarController)
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class FooService {
  @Inject()
  private fooRepository: FooRepository;

  async getUser(id: string): Promise<{ id: string; name: string } | null> {
    return this.fooRepository.findById(id);
  }

  async createUser(data: { id: string; name: string }): Promise<void> {
    return this.fooRepository.save(data);
  }
}
