import type { EggProtoImplClass, ModelIndexInfo } from '@eggjs/tegg-types';

import { IndexMeta, AttributeMeta } from '../model/index.ts';
import { ModelInfoUtil, NameUtil } from '../util/index.ts';

export class IndexMetaBuilder {
  private readonly clazz: EggProtoImplClass;
  private readonly attributes: Array<AttributeMeta>;

  constructor(clazz: EggProtoImplClass, attributes: Array<AttributeMeta>) {
    this.clazz = clazz;
    this.attributes = attributes;
  }

  build(): Array<IndexMeta> {
    return ModelInfoUtil.getModelIndices(this.clazz).map((indexInfo) => this.buildIndexMeta(indexInfo));
  }

  private buildIndexMeta(indexInfo: ModelIndexInfo): IndexMeta {
    const fields: string[] = [];
    for (const field of indexInfo.fields) {
      const attribute = this.attributes.find((t) => t.propertyName === field);
      if (!attribute) {
        throw new Error(`model ${this.clazz.name} has no attribute named ${field}`);
      }
      fields.push(attribute.attributeName);
    }

    let indexName: string;
    if (indexInfo.options?.name) {
      indexName = indexInfo.options!.name;
    } else {
      indexName = NameUtil.getIndexName(fields, {
        unique: indexInfo.options?.unique,
      });
    }
    return new IndexMeta(indexName, fields, indexInfo.options?.unique ?? false, indexInfo.options?.primary ?? false);
  }
}
