import type { CustomPointcutCallback, EggProtoImplClass, PointcutInfo } from '@eggjs/tegg-types';
import { PointcutType } from '@eggjs/tegg-types';

export class ClassPointInfo implements PointcutInfo {
  readonly type: PointcutType = PointcutType.CLASS;
  readonly clazz: EggProtoImplClass;
  readonly method: PropertyKey;

  constructor(clazz: EggProtoImplClass, method: PropertyKey) {
    this.clazz = clazz;
    this.method = method;
  }

  match(clazz: EggProtoImplClass, method: PropertyKey): boolean {
    return (
      // self class
      (this.clazz === clazz ||
        // inherit case
        clazz.prototype instanceof this.clazz) &&
      this.method === method
    );
  }
}

export class NamePointInfo implements PointcutInfo {
  readonly type: PointcutType = PointcutType.NAME;
  readonly className: RegExp;
  readonly methodName: RegExp;

  constructor(className: RegExp, methodName: RegExp) {
    this.className = className;
    this.methodName = methodName;
  }

  match(clazz: EggProtoImplClass, method: PropertyKey): boolean {
    return this.className.test(clazz.name) && this.methodName.test(String(method));
  }
}

export class CustomPointInfo implements PointcutInfo {
  readonly type: PointcutType = PointcutType.CUSTOM;
  readonly cb: CustomPointcutCallback;

  constructor(cb: CustomPointcutCallback) {
    this.cb = cb;
  }

  match(clazz: EggProtoImplClass, method: PropertyKey): boolean {
    return this.cb(clazz, method);
  }
}
