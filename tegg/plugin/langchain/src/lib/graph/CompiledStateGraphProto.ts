import type { GraphMetadata } from '@eggjs/langchain-decorator';
import type { EggPrototype, LoadUnit } from '@eggjs/metadata';
import { AccessLevel, ObjectInitType, IdenticalUtil } from '@eggjs/tegg';
import type { EggPrototypeName, QualifierInfo, Id, QualifierAttribute, QualifierValue } from '@eggjs/tegg';
import type { InjectObjectProto } from '@eggjs/tegg-types';

export class CompiledStateGraphProto implements EggPrototype {
  [key: symbol]: PropertyDescriptor;
  private readonly qualifiers: QualifierInfo[];
  readonly accessLevel = AccessLevel.PUBLIC;
  id: Id;
  readonly initType = ObjectInitType.SINGLETON;
  readonly injectObjects: InjectObjectProto[] = [];
  loadUnitId: string;
  readonly name: EggPrototypeName;
  readonly graphMetadata: GraphMetadata;
  readonly graphName: string;

  constructor(loadUnit: LoadUnit, protoName: string, graphName: string, graphMetadata: GraphMetadata) {
    this.loadUnitId = loadUnit.id;
    this.qualifiers = [];
    this.name = protoName;
    this.graphMetadata = graphMetadata;
    this.graphName = graphName;
    this.id = IdenticalUtil.createProtoId(loadUnit.id, protoName);
  }

  constructEggObject(): object {
    return {};
  }

  getMetaData<T>(_metadataKey?: any): T | undefined {
    // TODO set default metadata
    return;
  }

  verifyQualifier(qualifier: QualifierInfo): boolean {
    const selfQualifiers = this.qualifiers.find((t) => t.attribute === qualifier.attribute);
    return selfQualifiers?.value === qualifier.value;
  }

  verifyQualifiers(qualifiers: QualifierInfo[]): boolean {
    for (const qualifier of qualifiers) {
      if (!this.verifyQualifier(qualifier)) {
        return false;
      }
    }
    return true;
  }

  getQualifier(attribute: QualifierAttribute): QualifierValue | undefined {
    const qualifier = this.qualifiers.find((t) => t.attribute === attribute);
    return qualifier?.value;
  }
}
