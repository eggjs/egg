import { AccessLevel, Inject, SingletonProto } from '@eggjs/tegg';
import { Transactional } from '@eggjs/tegg/transaction';

import FooDAO from './dal/dao/FooDAO.ts';
import { Foo } from './Foo.ts';

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class FooService {
  @Inject()
  private readonly fooDAO: FooDAO;

  @Transactional()
  async succeedTransaction() {
    const foo = Foo.buildObj();
    foo.name = 'insert_succeed_transaction_1';
    const foo2 = Foo.buildObj();
    foo2.name = 'insert_succeed_transaction_2';
    await this.fooDAO.insert(foo);
    await this.fooDAO.insert(foo2);
  }

  @Transactional()
  async failedTransaction() {
    const foo = Foo.buildObj();
    foo.name = 'insert_failed_transaction_1';
    const foo2 = Foo.buildObj();
    foo2.name = 'insert_failed_transaction_2';
    await this.fooDAO.insert(foo);
    await this.fooDAO.insert(foo2);
    throw new Error('mock error');
  }
}
