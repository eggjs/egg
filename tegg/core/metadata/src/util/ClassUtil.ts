import { PrototypeUtil } from '@eggjs/core-decorator';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

export class ClassUtil {
  static classDescription(clazz: EggProtoImplClass): string {
    const filePath = PrototypeUtil.getFilePath(clazz);
    const name = this.className(clazz);
    let desc = `class:${String(name)}`;
    if (filePath) {
      desc += `@${filePath}`;
    }
    return desc;
  }

  static className(clazz: EggProtoImplClass): string {
    const property = PrototypeUtil.getProperty(clazz);
    return (property?.name || clazz.name) as string;
  }
}
