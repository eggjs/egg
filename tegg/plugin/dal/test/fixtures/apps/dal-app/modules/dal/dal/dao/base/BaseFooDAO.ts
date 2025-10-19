import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InsertResult, UpdateResult, DeleteResult } from '@eggjs/dal-decorator';
import { Inject } from '@eggjs/tegg';
import { Dao } from '@eggjs/tegg/dal';
import { type DataSource, DataSourceInjectName, DataSourceQualifier, type ColumnTsType } from '@eggjs/dal-decorator';

import { Foo } from '../../../Foo.ts';
import FooExtension from '../../extension/FooExtension.ts';
import Structure from '../../structure/Foo.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<T>;
/**
 * 自动生成的 FooDAO 基类
 * @class BaseFooDAO
 * @classdesc 该文件由 @eggjs/tegg 自动生成，请**不要**修改它！
 */
/* istanbul ignore next */
@Dao()
export class BaseFooDAO {
  static clazzModel: typeof Foo = Foo;
  static clazzExtension: typeof FooExtension = FooExtension;
  static tableStature: typeof Structure = Structure;
  private static _SQL: string;
  static get tableSql(): string {
    if (!this._SQL) {
      this._SQL = fs.readFileSync(path.join(__dirname, '../../structure/Foo.sql'), 'utf8');
    }
    return this._SQL;
  }
  @Inject({
    name: DataSourceInjectName,
  })
  @DataSourceQualifier('dal.foo.Foo')
  protected readonly dataSource: DataSource<Foo>;

  public async insert(raw: Optional<Foo, 'id'>): Promise<InsertResult> {
    const data: Record<string, any> = {};
    let tmp;

    tmp = raw.id;
    if (tmp !== undefined) {
      data.$id = tmp;
    }

    tmp = raw.name;
    if (tmp !== undefined) {
      data.$name = tmp;
    }

    tmp = raw.col1;
    if (tmp !== undefined) {
      data.$col1 = tmp;
    }

    tmp = raw.bitColumn;
    if (tmp !== undefined) {
      data.$bitColumn = tmp;
    }

    tmp = raw.boolColumn;
    if (tmp !== undefined) {
      data.$boolColumn = tmp;
    }

    tmp = raw.tinyIntColumn;
    if (tmp !== undefined) {
      data.$tinyIntColumn = tmp;
    }

    tmp = raw.smallIntColumn;
    if (tmp !== undefined) {
      data.$smallIntColumn = tmp;
    }

    tmp = raw.mediumIntColumn;
    if (tmp !== undefined) {
      data.$mediumIntColumn = tmp;
    }

    tmp = raw.intColumn;
    if (tmp !== undefined) {
      data.$intColumn = tmp;
    }

    tmp = raw.bigIntColumn;
    if (tmp !== undefined) {
      data.$bigIntColumn = tmp;
    }

    tmp = raw.decimalColumn;
    if (tmp !== undefined) {
      data.$decimalColumn = tmp;
    }

    tmp = raw.floatColumn;
    if (tmp !== undefined) {
      data.$floatColumn = tmp;
    }

    tmp = raw.doubleColumn;
    if (tmp !== undefined) {
      data.$doubleColumn = tmp;
    }

    tmp = raw.dateColumn;
    if (tmp !== undefined) {
      data.$dateColumn = tmp;
    }

    tmp = raw.dateTimeColumn;
    if (tmp !== undefined) {
      data.$dateTimeColumn = tmp;
    }

    tmp = raw.timestampColumn;
    if (tmp !== undefined) {
      data.$timestampColumn = tmp;
    }

    tmp = raw.timeColumn;
    if (tmp !== undefined) {
      data.$timeColumn = tmp;
    }

    tmp = raw.yearColumn;
    if (tmp !== undefined) {
      data.$yearColumn = tmp;
    }

    tmp = raw.varCharColumn;
    if (tmp !== undefined) {
      data.$varCharColumn = tmp;
    }

    tmp = raw.binaryColumn;
    if (tmp !== undefined) {
      data.$binaryColumn = tmp;
    }

    tmp = raw.varBinaryColumn;
    if (tmp !== undefined) {
      data.$varBinaryColumn = tmp;
    }

    tmp = raw.tinyBlobColumn;
    if (tmp !== undefined) {
      data.$tinyBlobColumn = tmp;
    }

    tmp = raw.tinyTextColumn;
    if (tmp !== undefined) {
      data.$tinyTextColumn = tmp;
    }

    tmp = raw.blobColumn;
    if (tmp !== undefined) {
      data.$blobColumn = tmp;
    }

    tmp = raw.textColumn;
    if (tmp !== undefined) {
      data.$textColumn = tmp;
    }

    tmp = raw.mediumBlobColumn;
    if (tmp !== undefined) {
      data.$mediumBlobColumn = tmp;
    }

    tmp = raw.longBlobColumn;
    if (tmp !== undefined) {
      data.$longBlobColumn = tmp;
    }

    tmp = raw.mediumTextColumn;
    if (tmp !== undefined) {
      data.$mediumTextColumn = tmp;
    }

    tmp = raw.longTextColumn;
    if (tmp !== undefined) {
      data.$longTextColumn = tmp;
    }

    tmp = raw.enumColumn;
    if (tmp !== undefined) {
      data.$enumColumn = tmp;
    }

    tmp = raw.setColumn;
    if (tmp !== undefined) {
      data.$setColumn = tmp;
    }

    tmp = raw.geometryColumn;
    if (tmp !== undefined) {
      data.$geometryColumn = tmp;
    }

    tmp = raw.pointColumn;
    if (tmp !== undefined) {
      data.$pointColumn = tmp;
    }

    tmp = raw.lineStringColumn;
    if (tmp !== undefined) {
      data.$lineStringColumn = tmp;
    }

    tmp = raw.polygonColumn;
    if (tmp !== undefined) {
      data.$polygonColumn = tmp;
    }

    tmp = raw.multipointColumn;
    if (tmp !== undefined) {
      data.$multipointColumn = tmp;
    }

    tmp = raw.multiLineStringColumn;
    if (tmp !== undefined) {
      data.$multiLineStringColumn = tmp;
    }

    tmp = raw.multiPolygonColumn;
    if (tmp !== undefined) {
      data.$multiPolygonColumn = tmp;
    }

    tmp = raw.geometryCollectionColumn;
    if (tmp !== undefined) {
      data.$geometryCollectionColumn = tmp;
    }

    tmp = raw.jsonColumn;
    if (tmp !== undefined) {
      data.$jsonColumn = tmp;
    }

    return this.dataSource.executeRawScalar('insert', data);
  }

  public async update(id: ColumnTsType['INT'], data: Partial<Foo>): Promise<UpdateResult> {
    const newData: Record<string, any> = {
      primary: {
        id,
      },
    };
    let tmp;

    tmp = data.id;
    if (tmp !== undefined) {
      newData.$id = tmp;
    }

    tmp = data.name;
    if (tmp !== undefined) {
      newData.$name = tmp;
    }

    tmp = data.col1;
    if (tmp !== undefined) {
      newData.$col1 = tmp;
    }

    tmp = data.bitColumn;
    if (tmp !== undefined) {
      newData.$bitColumn = tmp;
    }

    tmp = data.boolColumn;
    if (tmp !== undefined) {
      newData.$boolColumn = tmp;
    }

    tmp = data.tinyIntColumn;
    if (tmp !== undefined) {
      newData.$tinyIntColumn = tmp;
    }

    tmp = data.smallIntColumn;
    if (tmp !== undefined) {
      newData.$smallIntColumn = tmp;
    }

    tmp = data.mediumIntColumn;
    if (tmp !== undefined) {
      newData.$mediumIntColumn = tmp;
    }

    tmp = data.intColumn;
    if (tmp !== undefined) {
      newData.$intColumn = tmp;
    }

    tmp = data.bigIntColumn;
    if (tmp !== undefined) {
      newData.$bigIntColumn = tmp;
    }

    tmp = data.decimalColumn;
    if (tmp !== undefined) {
      newData.$decimalColumn = tmp;
    }

    tmp = data.floatColumn;
    if (tmp !== undefined) {
      newData.$floatColumn = tmp;
    }

    tmp = data.doubleColumn;
    if (tmp !== undefined) {
      newData.$doubleColumn = tmp;
    }

    tmp = data.dateColumn;
    if (tmp !== undefined) {
      newData.$dateColumn = tmp;
    }

    tmp = data.dateTimeColumn;
    if (tmp !== undefined) {
      newData.$dateTimeColumn = tmp;
    }

    tmp = data.timestampColumn;
    if (tmp !== undefined) {
      newData.$timestampColumn = tmp;
    }

    tmp = data.timeColumn;
    if (tmp !== undefined) {
      newData.$timeColumn = tmp;
    }

    tmp = data.yearColumn;
    if (tmp !== undefined) {
      newData.$yearColumn = tmp;
    }

    tmp = data.varCharColumn;
    if (tmp !== undefined) {
      newData.$varCharColumn = tmp;
    }

    tmp = data.binaryColumn;
    if (tmp !== undefined) {
      newData.$binaryColumn = tmp;
    }

    tmp = data.varBinaryColumn;
    if (tmp !== undefined) {
      newData.$varBinaryColumn = tmp;
    }

    tmp = data.tinyBlobColumn;
    if (tmp !== undefined) {
      newData.$tinyBlobColumn = tmp;
    }

    tmp = data.tinyTextColumn;
    if (tmp !== undefined) {
      newData.$tinyTextColumn = tmp;
    }

    tmp = data.blobColumn;
    if (tmp !== undefined) {
      newData.$blobColumn = tmp;
    }

    tmp = data.textColumn;
    if (tmp !== undefined) {
      newData.$textColumn = tmp;
    }

    tmp = data.mediumBlobColumn;
    if (tmp !== undefined) {
      newData.$mediumBlobColumn = tmp;
    }

    tmp = data.longBlobColumn;
    if (tmp !== undefined) {
      newData.$longBlobColumn = tmp;
    }

    tmp = data.mediumTextColumn;
    if (tmp !== undefined) {
      newData.$mediumTextColumn = tmp;
    }

    tmp = data.longTextColumn;
    if (tmp !== undefined) {
      newData.$longTextColumn = tmp;
    }

    tmp = data.enumColumn;
    if (tmp !== undefined) {
      newData.$enumColumn = tmp;
    }

    tmp = data.setColumn;
    if (tmp !== undefined) {
      newData.$setColumn = tmp;
    }

    tmp = data.geometryColumn;
    if (tmp !== undefined) {
      newData.$geometryColumn = tmp;
    }

    tmp = data.pointColumn;
    if (tmp !== undefined) {
      newData.$pointColumn = tmp;
    }

    tmp = data.lineStringColumn;
    if (tmp !== undefined) {
      newData.$lineStringColumn = tmp;
    }

    tmp = data.polygonColumn;
    if (tmp !== undefined) {
      newData.$polygonColumn = tmp;
    }

    tmp = data.multipointColumn;
    if (tmp !== undefined) {
      newData.$multipointColumn = tmp;
    }

    tmp = data.multiLineStringColumn;
    if (tmp !== undefined) {
      newData.$multiLineStringColumn = tmp;
    }

    tmp = data.multiPolygonColumn;
    if (tmp !== undefined) {
      newData.$multiPolygonColumn = tmp;
    }

    tmp = data.geometryCollectionColumn;
    if (tmp !== undefined) {
      newData.$geometryCollectionColumn = tmp;
    }

    tmp = data.jsonColumn;
    if (tmp !== undefined) {
      newData.$jsonColumn = tmp;
    }

    return this.dataSource.executeRawScalar('update', newData);
  }

  public async delete(id: ColumnTsType['INT']): Promise<DeleteResult> {
    return this.dataSource.executeRawScalar('delete', {
      id,
    });
  }

  public async del(id: ColumnTsType['INT']): Promise<DeleteResult> {
    return this.dataSource.executeRawScalar('delete', {
      id,
    });
  }

  public async findByCol1($col1: ColumnTsType['VARCHAR']): Promise<Foo[]> {
    return this.dataSource.execute('findByCol1', {
      $col1,
    });
  }

  public async findOneByCol1($col1: ColumnTsType['VARCHAR']): Promise<Foo | null> {
    return this.dataSource.executeScalar('findOneByCol1', {
      $col1,
    });
  }

  public async findByUkNameCol1($name: ColumnTsType['VARCHAR'], $col1: ColumnTsType['VARCHAR']): Promise<Foo[]> {
    return this.dataSource.execute('findByUkNameCol1', {
      $name,
      $col1,
    });
  }

  public async findOneByUkNameCol1(
    $name: ColumnTsType['VARCHAR'],
    $col1: ColumnTsType['VARCHAR']
  ): Promise<Foo | null> {
    return this.dataSource.executeScalar('findOneByUkNameCol1', {
      $name,
      $col1,
    });
  }

  public async findById($id: ColumnTsType['INT']): Promise<Foo | null> {
    return this.dataSource.executeScalar('findById', {
      $id,
    });
  }

  public async findByPrimary($id: ColumnTsType['INT']): Promise<Foo | null> {
    return this.dataSource.executeScalar('findById', {
      $id,
    });
  }
}
