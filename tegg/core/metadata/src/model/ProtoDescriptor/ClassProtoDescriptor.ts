import { QualifierUtil } from '@eggjs/core-decorator';
import { NameUtil } from '@eggjs/tegg-common-util';
import { type EggProtoImplClass, type ProtoDescriptor, ProtoDescriptorType } from '@eggjs/tegg-types';

import { AbstractProtoDescriptor, type AbstractProtoDescriptorOptions } from './AbstractProtoDescriptor.ts';

export interface ClassProtoDescriptorOptions extends Omit<AbstractProtoDescriptorOptions, 'type'> {
  clazz: EggProtoImplClass;
}

export class ClassProtoDescriptor extends AbstractProtoDescriptor {
  clazz: EggProtoImplClass;
  clazzName: string;

  static isClassProtoDescriptor(descriptor: ProtoDescriptor): descriptor is ClassProtoDescriptor {
    return (descriptor as AbstractProtoDescriptor).type === ProtoDescriptorType.CLASS;
  }

  constructor(options: ClassProtoDescriptorOptions) {
    super({
      type: ProtoDescriptorType.CLASS,
      ...options,
    });
    this.clazz = options.clazz;
    this.className = NameUtil.cleanName(this.clazz.name);
  }

  equal(protoDescriptor: ProtoDescriptor): boolean {
    if (!ClassProtoDescriptor.isClassProtoDescriptor(protoDescriptor)) {
      return false;
    }
    return (
      this.clazz === protoDescriptor.clazz &&
      this.name === protoDescriptor.name &&
      this.accessLevel === protoDescriptor.accessLevel &&
      this.initType === protoDescriptor.initType &&
      this.instanceModuleName === protoDescriptor.instanceModuleName &&
      QualifierUtil.equalQualifiers(this.qualifiers, protoDescriptor.qualifiers)
    );
  }
}
