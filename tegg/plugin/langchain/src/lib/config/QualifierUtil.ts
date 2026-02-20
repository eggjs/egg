import { ConfigSourceQualifierAttribute } from '@eggjs/tegg';
import type { QualifierInfo } from '@eggjs/tegg';

// TODO refactor to ModuleConfig and mist impl
export class QualifierUtil {
  static getModuleConfigQualifier(moduleName: string): Record<string, QualifierInfo[]> {
    return {
      moduleConfig: [
        {
          attribute: ConfigSourceQualifierAttribute,
          value: moduleName,
        },
      ],
    };
  }
}
