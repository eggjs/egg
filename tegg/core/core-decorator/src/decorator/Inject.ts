import { debuglog } from 'node:util';

import { ObjectUtils } from '@eggjs/tegg-common-util';
import {
  type EggProtoImplClass,
  type InjectObjectInfo,
  type InjectConstructorInfo,
  type InjectParams,
  InjectType,
  InitTypeQualifierAttribute,
} from '@eggjs/tegg-types';

import { PrototypeUtil, QualifierUtil } from '../util/index.ts';

const debug = debuglog('tegg/core/core-decorator/decorator/Inject');

function guessInjectInfo(clazz: EggProtoImplClass, name: PropertyKey, proto: any) {
  let objName: PropertyKey | undefined;
  let initType: string | undefined;

  if (typeof proto === 'function' && proto !== Object) {
    // if property type is function and not Object( means maybe proto class ), then try to read EggPrototypeInfo.name as obj name
    const info = PrototypeUtil.getProperty(proto as EggProtoImplClass);
    objName = info?.name;
    // try to read EggPrototypeInfo.initType as qualifier
    if (info?.initType) {
      const customInitType = QualifierUtil.getProperQualifier(clazz, name, InitTypeQualifierAttribute);
      if (!customInitType) {
        initType = info.initType;
      }
    }
  }

  return {
    objName,
    initType,
  };
}

export type InjectDecorator = (target: any, propertyKey?: PropertyKey, parameterIndex?: number) => void;

/**
 * Inject decorator Factory
 * @param param - Inject parameters
 * @returns Inject decorator
 */
export function Inject(param?: InjectParams | string): InjectDecorator {
  const injectParam = typeof param === 'string' ? { name: param } : param;

  function propertyInject(target: any, propertyKey: PropertyKey) {
    let objName: PropertyKey | undefined;
    let initType: string | undefined;
    if (!injectParam) {
      // `@Inject() foo: FooService`
      // try to read design:type from proto
      const proto = PrototypeUtil.getDesignType(target, propertyKey);
      const result = guessInjectInfo(target.constructor, propertyKey, proto);
      objName = result.objName;
      initType = result.initType;
    } else {
      // params allow string or object
      objName = injectParam?.name;
    }

    const injectObject: InjectObjectInfo = {
      refName: propertyKey,
      objName: objName || propertyKey,
    };

    if (injectParam?.optional) {
      injectObject.optional = true;
    }

    PrototypeUtil.setInjectType(target.constructor, InjectType.PROPERTY);
    PrototypeUtil.addInjectObject(target.constructor as EggProtoImplClass, injectObject);
    debug(
      'propertyInject, clazz: %s, propertyKey: %s, injectObject: %o',
      target.constructor.name,
      propertyKey,
      injectObject,
    );
    // console.trace();

    if (initType) {
      QualifierUtil.addProperQualifier(target.constructor, propertyKey, InitTypeQualifierAttribute, initType);
    }
  }

  function constructorInject(target: any, parameterIndex: number) {
    const argNames = ObjectUtils.getConstructorArgNameList(target);
    const argName = argNames[parameterIndex];

    let objName: PropertyKey | undefined;
    let initType: string | undefined;

    if (!injectParam) {
      // try to read proto from design:paramtypes
      const protos = PrototypeUtil.getDesignParamtypes(target);
      ({ objName, initType } = guessInjectInfo(target, argName, protos?.[parameterIndex]));
    } else {
      // params allow string or object
      objName = injectParam?.name;
    }

    const injectObject: InjectConstructorInfo = {
      refIndex: parameterIndex,
      refName: argName,
      objName: objName || argName,
    };

    if (injectParam?.optional) {
      injectObject.optional = true;
    }

    PrototypeUtil.setInjectType(target, InjectType.CONSTRUCTOR);
    PrototypeUtil.addInjectConstructor(target as EggProtoImplClass, injectObject);

    if (initType) {
      QualifierUtil.addProperQualifier(target, argName, InitTypeQualifierAttribute, initType);
    }
  }

  return function (target: any, propertyKey?: PropertyKey, parameterIndex?: number): void {
    if (typeof parameterIndex === 'undefined') {
      propertyInject(target, propertyKey!);
    } else {
      constructorInject(target, parameterIndex!);
    }
  };
}

/**
 * InjectOptional decorator Factory
 * @param param - InjectOptional parameters
 * @returns InjectOptional decorator
 */
export function InjectOptional(param?: Omit<InjectParams, 'optional'> | string): InjectDecorator {
  const injectParam = typeof param === 'string' ? { name: param } : param;

  return Inject({
    ...injectParam,
    optional: true,
  });
}
