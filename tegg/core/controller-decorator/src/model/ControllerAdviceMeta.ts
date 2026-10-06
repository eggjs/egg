import type { EggObjectName, EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

export class ControllerAdviceMeta {
  readonly clazz: EggProtoImplClass<IAdvice>;
  readonly objectName: EggObjectName;

  constructor(controllerClassName: string, methodName: PropertyKey, clazz: EggProtoImplClass<IAdvice>, index: number) {
    this.clazz = clazz;
    this.objectName = `controller-advice:${controllerClassName}#${String(methodName)}#${clazz.name}#${index}`;
  }
}
