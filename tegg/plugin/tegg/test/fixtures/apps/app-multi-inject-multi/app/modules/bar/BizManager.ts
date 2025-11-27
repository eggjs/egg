import {
  MultiInstanceProto,
  AccessLevel,
  Inject,
  ObjectInitType,
  type ObjectInfo,
  type MultiInstancePrototypeGetObjectsContext,
  MultiInstanceInfo,
} from '@eggjs/tegg';
import { type EggProtoImplClass, QualifierUtil } from '@eggjs/tegg';
import { ModuleConfigUtil } from '@eggjs/tegg-common-util';

import { Secret, SecretQualifierAttribute } from '../foo/Secret.ts';

export const BizManagerQualifierAttribute: symbol = Symbol.for('Qualifier.BizManager');
export const BizManagerInjectName = 'bizManager';

export function BizManagerQualifier(chatModelName: string) {
  return function (target: any, propertyKey: PropertyKey): void {
    QualifierUtil.addProperQualifier(
      target.constructor as EggProtoImplClass,
      propertyKey,
      BizManagerQualifierAttribute,
      chatModelName,
    );
  };
}

@MultiInstanceProto({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
  // 从 module.yml 中动态获取配置来决定需要初始化几个对象
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext) {
    const config = ModuleConfigUtil.loadModuleConfigSync(ctx.unitPath) as any;
    const name = ModuleConfigUtil.readModuleNameSync(ctx.unitPath);
    const clients = config?.BizManager?.clients;
    if (!clients) return [];
    return Object.keys(clients).map((clientName: string) => {
      return {
        name: BizManagerInjectName,
        qualifiers: [
          {
            attribute: BizManagerQualifierAttribute,
            value: clientName,
          },
        ],
        properQualifiers: {
          secret: [
            {
              attribute: SecretQualifierAttribute,
              value: name,
            },
          ],
        },
      };
    });
  },
})
export class BizManager {
  readonly name: string;
  readonly secret: string;

  constructor(@Inject() secret: Secret, @MultiInstanceInfo([BizManagerQualifierAttribute]) objInfo: ObjectInfo) {
    this.name = objInfo.qualifiers.find((t) => t.attribute === BizManagerQualifierAttribute)!.value as string;
    this.secret = secret.getSecret(this.name);
  }
}
