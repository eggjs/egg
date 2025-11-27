import type { EggProtoImplClass } from '@eggjs/tegg-types';

import { ModelMetadata } from '../model/index.ts';
import { ModelInfoUtil, NameUtil } from '../util/index.ts';
import { AttributeMetaBuilder } from './AttributeMetaBuilder.ts';
import { IndexMetaBuilder } from './IndexMetaBuilder.ts';

export class ModelMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  build(): ModelMetadata {
    const dataSource = ModelInfoUtil.getDataSource(this.clazz);
    const tableName = ModelInfoUtil.getTableName(this.clazz) || NameUtil.getTableName(this.clazz.name);
    const attributeMetaBuilder = new AttributeMetaBuilder(this.clazz);
    const attributes = attributeMetaBuilder.build();
    const indexMetaBuilder = new IndexMetaBuilder(this.clazz, attributes);
    const indices = indexMetaBuilder.build();
    return new ModelMetadata(dataSource, tableName, attributes, indices);
  }
}
