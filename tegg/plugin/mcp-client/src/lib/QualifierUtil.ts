import { ConfigSourceQualifierAttribute } from '@eggjs/tegg';

// TODO refactor to ModuleConfig and mist impl
export class QualifierUtil {
  static getModuleConfigQualifier(moduleName: string) {
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
