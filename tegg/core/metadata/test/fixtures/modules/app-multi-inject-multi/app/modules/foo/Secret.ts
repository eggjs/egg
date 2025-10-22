import {
  MultiInstanceProto,
  type MultiInstancePrototypeGetObjectsContext,
  ObjectInitType,
  AccessLevel,
  QualifierUtil,
} from '@eggjs/core-decorator';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

export const SecretQualifierAttribute: symbol = Symbol.for('Qualifier.Secret');
export const SecretInjectName = 'secret';

export function SecretQualifier(chatModelName: string) {
  return function (target: any, propertyKey: PropertyKey): void {
    QualifierUtil.addProperQualifier(
      target.constructor as EggProtoImplClass,
      propertyKey,
      SecretQualifierAttribute,
      chatModelName,
    );
  };
}

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath) as any;
    const keys = config?.secret?.keys;
    if (!keys || keys.length === 0) return [];
    return keys.map((t: string) => {
      return {
        name: SecretInjectName,
        qualifiers: [
          {
            attribute: SecretQualifierAttribute,
            value: t,
          },
        ],
      };
    });
  },
})
export class Secret {
  getSecret(key: string): string {
    return key + '233';
  }
}
