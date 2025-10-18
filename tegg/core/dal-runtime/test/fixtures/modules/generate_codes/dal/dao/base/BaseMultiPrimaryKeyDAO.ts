import fs from 'node:fs';
import path from 'node:path';
import type { InsertResult, UpdateResult, DeleteResult } from '@eggjs/dal-decorator';
import { Inject } from '@eggjs/tegg';
import { Dao } from '@eggjs/tegg/dal';
import { DataSource, DataSourceInjectName, DataSourceQualifier, ColumnTsType } from '@eggjs/dal-decorator';
import { MultiPrimaryKey } from '../../../MultiPrimaryKey';
import MultiPrimaryKeyExtension from '../../extension/MultiPrimaryKeyExtension';
import Structure from '../../structure/MultiPrimaryKey.json';
const SQL = Symbol('Dao#sql');

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;
/**
 * 自动生成的 MultiPrimaryKeyDAO 基类
 * @class BaseMultiPrimaryKeyDAO
 * @classdesc 该文件由 @eggjs/tegg 自动生成，请**不要**修改它！
 */
/* istanbul ignore next */
@Dao()
export class BaseMultiPrimaryKeyDAO {
  static clazzModel = MultiPrimaryKey;
  static clazzExtension = MultiPrimaryKeyExtension;
  static tableStature = Structure;
  static get tableSql() {
    if (!this[SQL]) {
      this[SQL] = fs.readFileSync(path.join(__dirname, '../../structure/MultiPrimaryKey.sql'), 'utf8');
    }
    return this[SQL];
  }
  @Inject({
    name: DataSourceInjectName,
  })
  @DataSourceQualifier('dal.default.MultiPrimaryKey')
  protected readonly dataSource: DataSource<MultiPrimaryKey>;

  public async insert(raw: Optional<MultiPrimaryKey, 'id1' | 'id2'>): Promise<InsertResult> {
    const data: Record<string, any> = {};
    let tmp;

    tmp = raw.id1;
    if (tmp !== undefined) {
      data.$id1 = tmp;
    }

    tmp = raw.id2;
    if (tmp !== undefined) {
      data.$id2 = tmp;
    }

    tmp = raw.name;
    if (tmp !== undefined) {
      data.$name = tmp;
    }

    return this.dataSource.executeRawScalar('insert', data);
  }

  public async update(
    primary: {
      id1: ColumnTsType['INT'];
      id2: ColumnTsType['INT'];
    },
    data: Partial<MultiPrimaryKey>
  ): Promise<UpdateResult> {
    const newData: Record<string, any> = {
      primary,
    };
    let tmp;

    tmp = data.id1;
    if (tmp !== undefined) {
      newData.$id1 = tmp;
    }

    tmp = data.id2;
    if (tmp !== undefined) {
      newData.$id2 = tmp;
    }

    tmp = data.name;
    if (tmp !== undefined) {
      newData.$name = tmp;
    }

    return this.dataSource.executeRawScalar('update', newData);
  }

  public async delete(primary: { id1: ColumnTsType['INT']; id2: ColumnTsType['INT'] }): Promise<DeleteResult> {
    return this.dataSource.executeRawScalar('delete', primary);
  }

  public async del(primary: { id1: ColumnTsType['INT']; id2: ColumnTsType['INT'] }): Promise<DeleteResult> {
    return this.dataSource.executeRawScalar('delete', primary);
  }

  public async findByPrimary($id1: ColumnTsType['INT'], $id2: ColumnTsType['INT']): Promise<MultiPrimaryKey | null> {
    return this.dataSource.executeScalar('findByPrimary', {
      $id1,
      $id2,
    });
  }
}
