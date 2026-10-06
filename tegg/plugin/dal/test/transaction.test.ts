import type { MysqlDataSourceManager } from '@eggjs/dal-plugin';
import { mm, type MockApplication } from '@eggjs/mock';
import { describe, afterEach, beforeAll, afterAll, it, expect } from 'vitest';

import FooDAO from './fixtures/apps/dal-app/modules/dal/dal/dao/FooDAO.ts';
import { Foo } from './fixtures/apps/dal-app/modules/dal/Foo.ts';
import { FooService } from './fixtures/apps/dal-app/modules/dal/FooService.ts';
import { getFixtures } from './utils.ts';

describe('plugin/dal/test/transaction.test.ts', () => {
  let app: MockApplication;

  async function cleanTransactionRows(): Promise<void> {
    const mysqlDataSourceManager = await app.getEggObjectFromName<MysqlDataSourceManager>('mysqlDataSourceManager');
    const dataSource = mysqlDataSourceManager.get('dal', 'foo')!;
    // The CRUD suite uses this database concurrently. Only delete rows owned by this suite.
    await dataSource.query('delete from egg_foo where name in (?, ?, ?, ?)', [
      'insert_succeed_transaction_1',
      'insert_succeed_transaction_2',
      'insert_failed_transaction_1',
      'insert_failed_transaction_2',
    ]);
  }

  afterEach(async () => {
    return mm.restore();
  });

  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/dal-app'),
    });
    await app.ready();
  }, 30_000);

  afterEach(cleanTransactionRows);

  afterAll(() => {
    return app.close();
  });

  it('should preserve unrelated rows when cleaning transaction fixtures', async () => {
    await app.mockModuleContextScope(async () => {
      const fooDao = await app.getEggObject(FooDAO);
      const foo = Foo.buildObj();
      foo.name = 'unrelated_transaction_cleanup';
      const { insertId } = await fooDao.insert(foo);
      try {
        await cleanTransactionRows();
        expect((await fooDao.findByPrimary(insertId))?.id).toBe(insertId);
        expect((await fooDao.delete(insertId)).affectedRows).toBe(1);
      } finally {
        await fooDao.delete(insertId);
      }
    });
  });

  describe('succeed transaction', () => {
    it('should commit', async () => {
      await app.mockModuleContextScope(async () => {
        const fooService = await app.getEggObject(FooService);
        const fooDao = await app.getEggObject(FooDAO);
        await fooService.succeedTransaction();
        const foo1 = await fooDao.findByName('insert_succeed_transaction_1');
        const foo2 = await fooDao.findByName('insert_succeed_transaction_2');
        expect(foo1.length).toBe(1);
        expect(foo2.length).toBe(1);
      });
    });
  });

  describe('failed transaction', () => {
    it('should rollback', async () => {
      await app.mockModuleContextScope(async () => {
        const fooService = await app.getEggObject(FooService);
        const fooDao = await app.getEggObject(FooDAO);
        await expect(async () => {
          await fooService.failedTransaction();
        }).rejects.toThrow(/mock error/);
        const foo1 = await fooDao.findByName('insert_failed_transaction_1');
        const foo2 = await fooDao.findByName('insert_failed_transaction_2');
        expect(foo1.length).toBe(0);
        expect(foo2.length).toBe(0);
      });
    });
  });

  describe('transaction should be isolated', () => {
    it('should rollback', async () => {
      await app.mockModuleContextScope(async () => {
        const fooService = await app.getEggObject(FooService);
        const fooDao = await app.getEggObject(FooDAO);
        const [failedRes, succeedRes] = await Promise.allSettled([
          fooService.failedTransaction(),
          fooService.succeedTransaction(),
        ]);
        expect(failedRes.status).toBe('rejected');
        expect(succeedRes.status).toBe('fulfilled');
        const foo1 = await fooDao.findByName('insert_failed_transaction_1');
        const foo2 = await fooDao.findByName('insert_failed_transaction_2');
        expect(foo1.length).toBe(0);
        expect(foo2.length).toBe(0);

        const foo3 = await fooDao.findByName('insert_succeed_transaction_1');
        const foo4 = await fooDao.findByName('insert_succeed_transaction_2');
        expect(foo3.length).toBe(1);
        expect(foo4.length).toBe(1);
      });
    });
  });
});
