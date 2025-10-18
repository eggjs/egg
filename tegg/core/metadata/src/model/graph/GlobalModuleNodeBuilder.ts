import { type EggProtoImplClass, type ProtoDescriptor } from '@eggjs/tegg-types';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';

import { ProtoDescriptorHelper } from '../ProtoDescriptorHelper.ts';
import { GlobalModuleNode, type GlobalModuleNodeOptions } from './GlobalModuleNode.ts';

export class GlobalModuleNodeBuilder {
  private readonly name: string;
  private readonly unitPath: string;
  private readonly optional: boolean;
  private readonly protos: ProtoDescriptor[];

  constructor(options: GlobalModuleNodeOptions) {
    this.name = options.name;
    this.unitPath = options.unitPath;
    this.optional = options.optional;
    this.protos = [];
  }

  addClazz(clazz: EggProtoImplClass) {
    const proto = ProtoDescriptorHelper.createByInstanceClazz(clazz, {
      moduleName: this.name,
      unitPath: this.unitPath,
    });
    this.protos.push(proto);
    return this;
  }

  async addMultiInstanceClazz(clazz: EggProtoImplClass, defineModuleName: string, defineUnitPath: string) {
    const protos = await ProtoDescriptorHelper.createByMultiInstanceClazz(clazz, {
      defineModuleName,
      defineUnitPath,
      instanceModuleName: this.name,
      instanceDefineUnitPath: this.unitPath,
    });
    this.protos.push(...protos);
    return this;
  }

  build() {
    const node = new GlobalModuleNode({
      name: this.name,
      unitPath: this.unitPath,
      optional: this.optional,
    });
    for (const proto of this.protos) {
      node.addProto(proto);
    }
    return node;
  }

  static create(unitPath: string, optional = false) {
    const name = ModuleConfigUtil.readModuleNameSync(unitPath);
    return new GlobalModuleNodeBuilder({
      name,
      unitPath,
      optional,
    });
  }
}
