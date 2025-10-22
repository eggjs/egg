import { ColumnModel, IndexModel, TableModel } from '@eggjs/dal-decorator';
import { ColumnType, IndexType } from '@eggjs/tegg-types';
import type { BaseSpatialParams, ColumnTypeParams } from '@eggjs/tegg-types';

// TODO diff 实现
export class SqlGenerator {
  private formatComment(comment: string) {
    return comment.replace(/\n/g, '\\n');
  }

  private generateColumn(column: ColumnModel) {
    const sqls: string[] = [' ', column.columnName, this.generateColumnType(column.type)];
    if (column.canNull) {
      sqls.push('NULL');
    } else {
      sqls.push('NOT NULL');
    }
    if (
      (
        [
          ColumnType.POINT,
          ColumnType.GEOMETRY,
          ColumnType.POINT,
          ColumnType.LINESTRING,
          ColumnType.POLYGON,
          ColumnType.MULTIPOINT,
          ColumnType.MULTILINESTRING,
          ColumnType.MULTIPOLYGON,
          ColumnType.GEOMETRYCOLLECTION,
        ] as ColumnType[]
      ).includes(column.type.type)
    ) {
      const SRID = (column.type as BaseSpatialParams).SRID;
      if (SRID) {
        sqls.push(`SRID ${SRID}`);
      }
    }
    if (typeof column.default !== 'undefined') {
      sqls.push(`DEFAULT ${column.default}`);
    }
    if (column.autoIncrement) {
      sqls.push('AUTO_INCREMENT');
    }
    if (column.uniqueKey) {
      sqls.push('UNIQUE KEY');
    }
    if (column.primaryKey) {
      sqls.push('PRIMARY KEY');
    }
    if (column.comment) {
      sqls.push(`COMMENT '${this.formatComment(column.comment)}'`);
    }
    if (column.collate) {
      sqls.push(`COLLATE ${column.collate}`);
    }
    if (column.columnFormat) {
      sqls.push(`COLUMN_FORMAT ${column.columnFormat}`);
    }
    if (column.engineAttribute) {
      sqls.push(`ENGINE_ATTRIBUTE='${column.engineAttribute}'`);
    }
    if (column.secondaryEngineAttribute) {
      sqls.push(`SECONDARY_ENGINE_ATTRIBUTE='${column.secondaryEngineAttribute}'`);
    }
    return sqls.join(' ');
  }

  private generateColumnType(columnType: ColumnTypeParams) {
    const sqls: string[] = [];
    switch (columnType.type) {
      case ColumnType.BOOL: {
        sqls.push('BOOL');
        break;
      }
      case ColumnType.BIT: {
        if (columnType.length) {
          sqls.push(`BIT(${columnType.length})`);
        } else {
          sqls.push('BIT');
        }
        break;
      }
      case ColumnType.TINYINT:
      case ColumnType.SMALLINT:
      case ColumnType.MEDIUMINT:
      case ColumnType.INT:
      case ColumnType.BIGINT: {
        if (typeof columnType.length === 'number') {
          sqls.push(`${columnType.type}(${columnType.length})`);
        } else {
          sqls.push(columnType.type);
        }
        if (columnType.unsigned) {
          sqls.push('UNSIGNED');
        }
        if (columnType.zeroFill) {
          sqls.push('ZEROFILL');
        }
        break;
      }
      case ColumnType.DECIMAL:
      case ColumnType.FLOAT:
      case ColumnType.DOUBLE: {
        if (typeof columnType.length === 'number' && typeof columnType.fractionalLength === 'number') {
          sqls.push(`${columnType.type}(${columnType.length},${columnType.fractionalLength})`);
        } else if (typeof columnType.length === 'number') {
          sqls.push(`${columnType.type}(${columnType.length})`);
        } else {
          sqls.push('TINYINT');
        }
        if (columnType.unsigned) {
          sqls.push('UNSIGNED');
        }
        if (columnType.zeroFill) {
          sqls.push('ZEROFILL');
        }
        break;
      }
      case ColumnType.DATE: {
        sqls.push('DATE');
        break;
      }
      case ColumnType.DATETIME:
      case ColumnType.TIMESTAMP: {
        if (columnType.precision) {
          sqls.push(`${columnType.type}(${columnType.precision})`);
        } else {
          sqls.push(columnType.type);
        }
        if (columnType.autoUpdate) {
          if (columnType.precision) {
            sqls.push(`ON UPDATE CURRENT_TIMESTAMP(${columnType.precision})`);
          } else {
            sqls.push('ON UPDATE CURRENT_TIMESTAMP');
          }
        }
        break;
      }
      case ColumnType.TIME: {
        if (columnType.precision) {
          sqls.push(`${columnType.type}(${columnType.precision})`);
        } else {
          sqls.push(columnType.type);
        }
        break;
      }
      case ColumnType.YEAR: {
        sqls.push('YEAR');
        break;
      }
      case ColumnType.CHAR:
      case ColumnType.TEXT: {
        if (columnType.length) {
          sqls.push(`${columnType.type}(${columnType.length})`);
        } else {
          sqls.push(columnType.type);
        }
        if (columnType.characterSet) {
          sqls.push(`CHARACTER SET ${columnType.characterSet}`);
        }
        if (columnType.collate) {
          sqls.push(`COLLATE ${columnType.collate}`);
        }
        break;
      }
      case ColumnType.VARCHAR: {
        sqls.push(`${columnType.type}(${columnType.length})`);
        if (columnType.characterSet) {
          sqls.push(`CHARACTER SET ${columnType.characterSet}`);
        }
        if (columnType.collate) {
          sqls.push(`COLLATE ${columnType.collate}`);
        }
        break;
      }
      case ColumnType.BINARY: {
        if (columnType.length) {
          sqls.push(`${columnType.type}(${columnType.length})`);
        } else {
          sqls.push(columnType.type);
        }
        break;
      }
      case ColumnType.VARBINARY: {
        sqls.push(`${columnType.type}(${columnType.length})`);
        break;
      }
      case ColumnType.TINYBLOB: {
        sqls.push('TINYBLOB');
        break;
      }
      case ColumnType.TINYTEXT:
      case ColumnType.MEDIUMTEXT:
      case ColumnType.LONGTEXT: {
        sqls.push(columnType.type);
        if (columnType.characterSet) {
          sqls.push(`CHARACTER SET ${columnType.characterSet}`);
        }
        if (columnType.collate) {
          sqls.push(`COLLATE ${columnType.collate}`);
        }
        break;
      }
      case ColumnType.BLOB: {
        if (columnType.length) {
          sqls.push(`${columnType.type}(${columnType.length})`);
        } else {
          sqls.push(columnType.type);
        }
        break;
      }
      case ColumnType.MEDIUMBLOB: {
        sqls.push('MEDIUMBLOB');
        break;
      }
      case ColumnType.LONGBLOB: {
        sqls.push('LONGBLOB');
        break;
      }
      case ColumnType.ENUM: {
        const enumValue: string = columnType.enums.map((t) => `'${t}'`).join(',');
        sqls.push(`ENUM(${enumValue})`);
        if (columnType.characterSet) {
          sqls.push(`CHARACTER SET ${columnType.characterSet}`);
        }
        if (columnType.collate) {
          sqls.push(`COLLATE ${columnType.collate}`);
        }
        break;
      }
      case ColumnType.SET: {
        const enumValue: string = columnType.enums.map((t) => `'${t}'`).join(',');
        sqls.push(`SET(${enumValue})`);
        if (columnType.characterSet) {
          sqls.push(`CHARACTER SET ${columnType.characterSet}`);
        }
        if (columnType.collate) {
          sqls.push(`COLLATE ${columnType.collate}`);
        }
        break;
      }
      case ColumnType.JSON: {
        sqls.push('JSON');
        break;
      }
      case ColumnType.GEOMETRY:
      case ColumnType.POINT:
      case ColumnType.LINESTRING:
      case ColumnType.POLYGON:
      case ColumnType.MULTIPOINT:
      case ColumnType.MULTILINESTRING:
      case ColumnType.MULTIPOLYGON:
      case ColumnType.GEOMETRYCOLLECTION: {
        sqls.push(columnType.type);
        break;
      }
      default: {
        throw new Error(`unknown ColumnType ${columnType}`);
      }
    }
    return sqls.join(' ');
  }

  private generateIndex(indexModel: IndexModel) {
    const indexSql: string[] = [' '];
    switch (indexModel.type) {
      case IndexType.INDEX: {
        indexSql.push('KEY');
        break;
      }
      case IndexType.UNIQUE: {
        indexSql.push('UNIQUE KEY');
        break;
      }
      case IndexType.PRIMARY: {
        indexSql.push('PRIMARY KEY');
        break;
      }
      case IndexType.FULLTEXT: {
        indexSql.push('FULLTEXT KEY');
        break;
      }
      case IndexType.SPATIAL: {
        indexSql.push('SPATIAL KEY');
        break;
      }
      default: {
        throw new Error(`unknown IndexType ${indexModel.type}`);
      }
    }
    indexSql.push(indexModel.name);
    indexSql.push(`(${indexModel.keys.map((t) => t.columnName).join(',')})`);
    if (indexModel.storeType) {
      indexSql.push(`USING ${indexModel.storeType}`);
    }
    if (indexModel.parser) {
      indexSql.push(`WITH PARSER ${indexModel.parser}`);
    }
    if (indexModel.comment) {
      indexSql.push(`COMMENT '${this.formatComment(indexModel.comment)}'`);
    }
    if (indexModel.engineAttribute) {
      indexSql.push(`ENGINE_ATTRIBUTE='${indexModel.engineAttribute}'`);
    }
    if (indexModel.secondaryEngineAttribute) {
      indexSql.push(`SECONDARY_ENGINE_ATTRIBUTE='${indexModel.secondaryEngineAttribute}'`);
    }
    return indexSql.join(' ');
  }

  private generateTableOptions(tableModel: TableModel) {
    const sqls: string[] = [];
    if (tableModel.autoExtendSize) {
      sqls.push(`AUTOEXTEND_SIZE=${tableModel.autoExtendSize}`);
    }
    if (tableModel.autoIncrement) {
      sqls.push(`AUTO_INCREMENT=${tableModel.autoIncrement}`);
    }
    if (tableModel.avgRowLength) {
      sqls.push(`AVG_ROW_LENGTH=${tableModel.avgRowLength}`);
    }
    if (tableModel.characterSet) {
      sqls.push(`DEFAULT CHARACTER SET ${tableModel.characterSet}`);
    }
    if (tableModel.collate) {
      sqls.push(`DEFAULT COLLATE ${tableModel.collate}`);
    }
    if (tableModel.comment) {
      sqls.push(`COMMENT='${this.formatComment(tableModel.comment)}'`);
    }
    if (tableModel.compression) {
      sqls.push(`COMPRESSION='${tableModel.compression}'`);
    }
    if (typeof tableModel.encryption !== 'undefined') {
      sqls.push(`ENCRYPTION='${tableModel.encryption ? 'Y' : 'N'}'`);
    }
    if (typeof tableModel.engine !== 'undefined') {
      sqls.push(`ENGINE=${tableModel.engine}`);
    }
    if (tableModel.engineAttribute) {
      sqls.push(`ENGINE_ATTRIBUTE='${tableModel.engineAttribute}'`);
    }
    if (tableModel.secondaryEngineAttribute) {
      sqls.push(`SECONDARY_ENGINE_ATTRIBUTE = '${tableModel.secondaryEngineAttribute}'`);
    }
    if (tableModel.insertMethod) {
      sqls.push(`INSERT_METHOD=${tableModel.insertMethod}`);
    }
    if (tableModel.keyBlockSize) {
      sqls.push(`KEY_BLOCK_SIZE=${tableModel.keyBlockSize}`);
    }
    if (tableModel.maxRows) {
      sqls.push(`MAX_ROWS=${tableModel.maxRows}`);
    }
    if (tableModel.minRows) {
      sqls.push(`MIN_ROWS=${tableModel.minRows}`);
    }
    if (tableModel.rowFormat) {
      sqls.push(`ROW_FORMAT=${tableModel.rowFormat}`);
    }
    return sqls.join(', ');
  }

  generate(tableModel: TableModel): string {
    const createSql: string[] = [];
    createSql.push(`CREATE TABLE IF NOT EXISTS ${tableModel.name} (`);

    const columnSql: string[] = [];
    for (const column of tableModel.columns) {
      columnSql.push(this.generateColumn(column));
    }

    const indexSql: string[] = [];
    for (const index of tableModel.indices) {
      indexSql.push(this.generateIndex(index));
    }
    if (indexSql.length) {
      createSql.push(columnSql.join(',\n') + ',');
      createSql.push(indexSql.join(',\n'));
    } else {
      createSql.push(columnSql.join(',\n'));
    }
    createSql.push(`) ${this.generateTableOptions(tableModel)};`);

    return createSql.join('\n');
  }
}
