import { AttributeMeta } from './AttributeMeta.ts';
import { IndexMeta } from './IndexMeta.ts';

export class ModelMetadata {
  readonly dataSource: string | undefined;
  readonly tableName: string;
  readonly attributes: Array<AttributeMeta>;
  readonly indices: Array<IndexMeta>;

  constructor(
    dataSource: string | undefined,
    tableName: string,
    attributes: Array<AttributeMeta>,
    indices: Array<IndexMeta>
  ) {
    this.dataSource = dataSource;
    this.tableName = tableName;
    this.attributes = attributes;
    this.indices = indices;
  }
}
