import { TableModel } from '@eggjs/dal-decorator';
import { ColumnType, IndexType, SqlType, type SqlMap } from '@eggjs/tegg-types';
import type { Logger, GenerateSqlMap } from '@eggjs/tegg-types';
import _ from 'lodash';

import { TemplateUtil } from './TemplateUtil.ts';

export class BaseSqlMapGenerator {
  private readonly tableModel: TableModel;
  private readonly logger: Logger;

  constructor(tableModel: TableModel, logger: Logger) {
    this.tableModel = tableModel;
    this.logger = logger;
  }

  generateAllColumns(countIf: boolean): string {
    const str = this.tableModel.columns.map((t) => `\`${t.columnName}\``).join(',');
    return countIf ? `{% if $$count == true %}0{% else %}${str}{% endif %}` : str;
  }

  generateFindByPrimary(): Array<GenerateSqlMap> {
    const result: Array<GenerateSqlMap> = [];
    const primary = this.tableModel.getPrimary();
    if (!primary) {
      this.logger.warn(`表 \`${this.tableModel.name}\` 没有主键，无法生成主键查询语句。`);
      return result;
    }

    let sql = `SELECT ${this.generateAllColumns(true)}
               FROM \`${this.tableModel.name}\`
               WHERE `;

    sql += primary.keys.map((indexKey) => `\`${indexKey.columnName}\` = {{$${indexKey.propertyName}}}`).join(' AND ');
    if (primary.keys.length === 1) {
      result.push({
        type: SqlType.SELECT,
        name: `findBy${_.upperFirst(primary.keys[0].propertyName)}`,
        sql,
      });
    }
    result.push({
      name: 'findByPrimary',
      type: SqlType.SELECT,
      sql,
    });
    return result;
  }

  // TODO index 的左匹配
  generateFindByIndexes(): GenerateSqlMap[] {
    const sqlMaps: GenerateSqlMap[] = [];
    for (const index of this.tableModel.indices) {
      if (index.type === IndexType.PRIMARY) continue;

      let sql = `SELECT ${this.generateAllColumns(true)}
                 FROM \`${this.tableModel.name}\`
                 WHERE `;

      sql += index.keys
        .map((indexKey) => {
          const s = `\`${indexKey.columnName}\` {{ "IS" if $${indexKey.propertyName} == null else "=" }} {{$${indexKey.propertyName}}}`;
          return s;
        })
        .join(' AND ');

      const tempName = _.upperFirst(_.camelCase(index.keys.length === 1 ? index.keys[0].propertyName : index.name));
      sqlMaps.push({
        name: `findBy${tempName}`,
        type: SqlType.SELECT,
        sql,
      });
      sqlMaps.push({
        name: `findOneBy${tempName}`,
        type: SqlType.SELECT,
        sql: `${sql} LIMIT 0, 1`,
      });
    }
    return sqlMaps;
  }

  generateInsert(): string {
    let sql = `INSERT INTO \`${this.tableModel.name}\` `;
    sql += '{% set ___first = true %}';

    const keys: string[] = [];
    const values: string[] = [];
    for (const column of this.tableModel.columns) {
      const { propertyName, columnName, type } = column;
      if (column.propertyName !== 'gmtCreate' && column.propertyName !== 'gmtModified') {
        // Add filter for Spatial Type
        // - toPoint
        // - toLine
        // - toPolygon
        // - toGeometry
        // - toMultiPoint
        // - toMultiLine
        // - toMultiPolygon
        // - toGeometryCollection
        keys.push(
          `
        {% if $${propertyName} !== undefined %}
          {% if ___first %}
            {% set ___first = false %}
          {% else %}
          ,
          {% endif %}

          \`${columnName}\`
        {% endif %}
        `.trim(),
        );

        if (TemplateUtil.isSpatialType(column)) {
          const filter = TemplateUtil.getSpatialFilter(column.type.type);
          values.push(
            `
        {% if $${propertyName} !== undefined %}
          {% if ___first %}
            {% set ___first = false %}
          {% else %}
          ,
          {% endif %}

          {{$${propertyName} | ${filter}}}
        {% endif %}
        `.trim(),
          );
        } else if (column.type.type === ColumnType.JSON) {
          values.push(
            `
        {% if $${propertyName} !== undefined %}
          {% if ___first %}
            {% set ___first = false %}
          {% else %}
          ,
          {% endif %}

          {{$${propertyName} | toJson}}
        {% endif %}
        `.trim(),
          );
        } else {
          values.push(
            `
        {% if $${propertyName} !== undefined %}
          {% if ___first %}
            {% set ___first = false %}
          {% else %}
          ,
          {% endif %}

          {{$${propertyName}}}
        {% endif %}
        `.trim(),
          );
        }
      } else {
        let now;
        // Default value for gmtCreate/gmtModified
        // int:UNIX_TEIMESTAMP
        // bigint: ROUND(UNIX_TIMESTAMP(CURTIME(4)) * 1000)
        // datetime/timestamp Now()
        if (type.type === ColumnType.INT) {
          // 秒级时间戳
          now = 'UNIX_TIMESTAMP()';
        } else if (type.type === ColumnType.BIGINT) {
          // 毫秒级时间戳
          now = 'ROUND(UNIX_TIMESTAMP(CURTIME(4)) * 1000)';
        } else if (type.type === ColumnType.DATETIME || type.type === ColumnType.TIMESTAMP) {
          now = type.precision ? `NOW(${type.precision})` : 'NOW()';
        } else {
          this.logger.warn(`unknown type ${type.type} for ${propertyName}`);
        }
        keys.push(
          `
        {% if ___first %}
          {% set ___first = false %}
        {% else %}
        ,
        {% endif %}

        \`${columnName}\`
        `.trim(),
        );

        values.push(
          `
        {% if ___first %}
          {% set ___first = false %}
        {% else %}
        ,
        {% endif %}

        {{ $${propertyName} if $${propertyName} !== undefined else '${now}' }}
        `.trim(),
        );
      }
    }

    sql += `(${keys.join('')})`;
    sql += '{% set ___first = true %}';
    sql += `VALUES(${values.join('')});`;

    return sql;
  }

  generateUpdate(): string | undefined {
    const primary = this.tableModel.getPrimary();
    if (!primary) {
      this.logger.warn(`表 \`${this.tableModel.name}\` 没有主键，无法生成主键更新语句。`);
      return;
    }

    let sql = `UPDATE \`${this.tableModel.name}\` SET`;
    sql += '{% set ___first = true %}';
    const kv: string[] = [];
    for (const column of this.tableModel.columns) {
      const { type, propertyName, columnName } = column;
      let now;
      if (type.type === ColumnType.INT) {
        // 秒级时间戳
        now = 'UNIX_TIMESTAMP()';
      } else if (type.type === ColumnType.BIGINT) {
        // 毫秒级时间戳
        now = 'ROUND(UNIX_TIMESTAMP(CURTIME(4)) * 1000)';
      } else if (type.type === ColumnType.TIMESTAMP || type.type === ColumnType.DATETIME) {
        now = type.precision ? `NOW(${type.precision})` : 'NOW()';
      }

      // 若无更新时间字段，则自动更新该字段
      const temp =
        propertyName !== 'gmtModified'
          ? `
      {% if $${propertyName} !== undefined %}
        {% if ___first %}
          {% set ___first = false %}
        {% else %}
        ,
        {% endif %}

        \`${columnName}\` = {{$${propertyName}}}
      {% endif %}
      `
          : `
      {% if ___first %}
        {% set ___first = false %}
      {% else %}
      ,
      {% endif %}

      \`${columnName}\` =
      {{ $${propertyName} if $${propertyName} !== undefined else '${now}' }}
      `;
      kv.push(temp);
    }

    sql += kv.join('');
    sql += `WHERE ${primary.keys.map((indexKey) => `\`${indexKey.columnName}\` = {{primary.${indexKey.propertyName}}}`).join(' AND ')}`;

    return sql;
  }

  generateDelete(): string | undefined {
    const primary = this.tableModel.getPrimary();
    if (!primary) {
      this.logger.warn(`表 \`${this.tableModel.name}\` 没有主键，无法生成主键删除语句。`);
      return;
    }

    let sql = `DELETE
               FROM \`${this.tableModel.name}\`
               WHERE `;

    sql += primary.keys.map((indexKey) => `\`${indexKey.columnName}\` = {{${indexKey.propertyName}}}`).join(' AND ');

    return sql;
  }

  load(): Record<string, SqlMap> {
    const map: Record<string, SqlMap> = {};

    map.allColumns = {
      type: SqlType.BLOCK,
      content: this.generateAllColumns(false),
    };

    const sqlMaps: Array<GenerateSqlMap> = [
      /**
       * 以主键进行索引
       *
       *   + `findByPrimary`
       *   + 若为单主键，则再加 `findBy键名`
       */
      ...this.generateFindByPrimary(),
      /**
       * findBy 各索引
       *
       *   + 若为多列索引，则为 `findBy索引名`
       *   + 若为单列索引，则为 `findBy列名`
       */
      ...this.generateFindByIndexes(),
      /**
       * 插入
       */
      {
        name: 'insert',
        type: SqlType.INSERT,
        sql: this.generateInsert(),
      } as GenerateSqlMap,
      /**
       * 主键更新
       */
      {
        name: 'update',
        type: SqlType.UPDATE,
        sql: this.generateUpdate(),
      } as GenerateSqlMap,
      /**
       * 主键删除
       */
      {
        name: 'delete',
        type: SqlType.DELETE,
        sql: this.generateDelete(),
      } as GenerateSqlMap,
    ];
    for (const sqlMap of sqlMaps) {
      map[sqlMap.name] = {
        type: sqlMap.type,
        sql: sqlMap.sql,
      };
    }

    return map;
  }
}
