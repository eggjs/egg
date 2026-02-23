import { SingletonProto } from '@eggjs/core-decorator';

// PRIVATE (default) - internal to foo module, not accessible from bar
@SingletonProto()
export class FooRepository {
  async findById(id: string): Promise<{ id: string; name: string } | null> {
    return { id, name: 'repo user' };
  }

  async save(data: { id: string; name: string }): Promise<void> {
    void data;
  }
}
