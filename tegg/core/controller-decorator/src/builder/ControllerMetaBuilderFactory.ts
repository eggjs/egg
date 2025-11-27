import { Pointcut } from '@eggjs/aop-decorator';
import type {
  ControllerMetaBuilder,
  ControllerMetaBuilderCreator,
  ControllerMetadata,
  ControllerTypeLike,
  EggProtoImplClass,
} from '@eggjs/tegg-types';

import { ControllerInfoUtil, MethodInfoUtil } from '../util/index.ts';

export class ControllerMetaBuilderFactory {
  private static builderCreatorMap: Map<ControllerTypeLike, ControllerMetaBuilderCreator> = new Map();

  static registerControllerMetaBuilder(
    controllerType: ControllerTypeLike,
    controllerBuilderCreator: ControllerMetaBuilderCreator,
  ): void {
    this.builderCreatorMap.set(controllerType, controllerBuilderCreator);
  }

  static createControllerMetaBuilder(
    clazz: EggProtoImplClass,
    controllerType?: ControllerTypeLike,
  ): ControllerMetaBuilder | undefined {
    if (!controllerType) {
      controllerType = ControllerInfoUtil.getControllerType(clazz);
    }
    if (!controllerType) {
      return;
    }
    const creator = this.builderCreatorMap.get(controllerType);
    if (!creator) {
      throw new Error(`not found controller meta builder for type ${controllerType}`);
    }
    return creator(clazz);
  }

  static build(clazz: EggProtoImplClass, controllerType?: ControllerTypeLike): ControllerMetadata | undefined {
    const builder = ControllerMetaBuilderFactory.createControllerMetaBuilder(clazz, controllerType);
    if (!builder) return;
    const metadata = builder.build();
    if (!metadata) return;
    const controllerAopMws = ControllerInfoUtil.getControllerAopMiddlewares(clazz);
    for (const { name } of metadata.methods) {
      const methodAopMws = MethodInfoUtil.getMethodAopMiddlewares(clazz, name);
      if (MethodInfoUtil.shouldRegisterAopMiddlewarePointCut(clazz, name)) {
        for (const mw of [...methodAopMws, ...controllerAopMws].reverse()) {
          Pointcut(mw)(clazz.prototype, name);
        }
        MethodInfoUtil.registerAopMiddlewarePointcut(clazz, name);
      }
    }

    return metadata;
  }
}
