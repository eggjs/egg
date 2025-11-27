import { SqlType } from '@eggjs/tegg-types';
import type { SqlMap } from '@eggjs/tegg-types';
import { Template } from 'nunjucks';

import { NunjucksUtils } from './NunjucksUtil.ts';
import { TemplateUtil } from './TemplateUtil.ts';

export interface SqlGenerator {
  type: SqlType;
  template: Template;
  raw: string;
}

export class TableSqlMap {
  readonly name: string;
  private readonly map: Record<string, SqlMap>;
  private readonly blocks: Record<string, string>;
  private readonly sqlGenerator: Record<string, SqlGenerator>;

  constructor(name: string, map: Record<string, SqlMap>) {
    this.name = name;
    this.map = map;

    const env = NunjucksUtils.createEnv(name);
    const extracted = this.#extract(this.map);
    this.blocks = extracted.blocks;
    this.sqlGenerator = extracted.sqlGenerator;

    for (const key in this.blocks) {
      // istanbul ignore if
      if (!this.blocks.hasOwnProperty(key)) continue;
      env.addGlobal(key, this.blocks[key]);
    }

    env.addFilter('toJson', TemplateUtil.toJson);
    env.addFilter('toPoint', TemplateUtil.toPoint);
    env.addFilter('toLine', TemplateUtil.toLine);
    env.addFilter('toPolygon', TemplateUtil.toPolygon);
    env.addFilter('toGeometry', TemplateUtil.toGeometry);
    env.addFilter('toMultiPoint', TemplateUtil.toMultiPoint);
    env.addFilter('toMultiLine', TemplateUtil.toMultiLine);
    env.addFilter('toMultiPolygon', TemplateUtil.toMultiPolygon);
    env.addFilter('toGeometryCollection', TemplateUtil.toGeometryCollection);
  }

  #extract(map: Record<string, SqlMap>) {
    const ret = {
      blocks: {},
      sqlGenerator: {},
    } as {
      blocks: Record<string, string>;
      sqlGenerator: Record<string, SqlGenerator>;
    };

    for (const key in map) {
      // istanbul ignore if
      if (!map.hasOwnProperty(key)) continue;

      const sqlMap = map[key];

      switch (sqlMap.type) {
        case SqlType.BLOCK:
          ret.blocks[key] = sqlMap.content || '';
          break;
        case SqlType.INSERT:
        case SqlType.SELECT:
        case SqlType.UPDATE:
        case SqlType.DELETE:
        default:
          ret.sqlGenerator[key] = {
            type: sqlMap.type,
            template: NunjucksUtils.compile(this.name, key, sqlMap.sql || ''),
            raw: sqlMap.sql,
          };
          break;
      }
    }

    return ret;
  }

  generate(name: string, data: object, timezone: string): string {
    const generator = this.sqlGenerator[name];
    // istanbul ignore if
    if (!generator) {
      throw new Error(`No sql map named '${name}' in '${name}'.`);
    }

    const template = generator.template;
    (template as any).env.timezone = timezone;
    return template.render(data);
  }

  getType(name: string): SqlType {
    const generator = this.sqlGenerator[name];
    // istanbul ignore if
    if (!generator) {
      throw new Error(`No sql map named '${name}' in '${name}'.`);
    }

    return generator.type;
  }

  getTemplateString(name: string): string {
    const generator = this.sqlGenerator[name];
    // istanbul ignore if
    if (!generator) {
      throw new Error(`No sql map named '${name}' in '${name}'.`);
    }

    return generator.raw;
  }
}
