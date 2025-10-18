import assert from 'node:assert';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { ObjectUtils } from '@eggjs/tegg-common-util';
import { ClassUtil } from '@eggjs/tegg-metadata';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { ControllerType } from '@eggjs/tegg-types';

import { ControllerMetaBuilderFactory } from '../../builder/index.ts';
import { HTTPControllerMeta, HTTPMethodMeta } from '../../model/index.ts';
import { ControllerInfoUtil, ControllerMetadataUtil, HTTPInfoUtil, ControllerValidator } from '../../util/index.ts';
import { HTTPControllerMethodMetaBuilder } from './HTTPControllerMethodMetaBuilder.ts';

export class HTTPControllerMetaBuilder {
  private readonly clazz: EggProtoImplClass;

  constructor(clazz: EggProtoImplClass) {
    this.clazz = clazz;
  }

  private buildMethod(): HTTPMethodMeta[] {
    const methodNames = ObjectUtils.getProperties(this.clazz.prototype);
    const methods: HTTPMethodMeta[] = [];
    for (const methodName of methodNames) {
      const builder = new HTTPControllerMethodMetaBuilder(this.clazz, methodName);
      const methodMeta = builder.build();
      if (methodMeta) {
        methods.push(methodMeta);
      }
    }
    return methods;
  }

  build(): HTTPControllerMeta {
    ControllerValidator.validate(this.clazz);
    const controllerType = ControllerInfoUtil.getControllerType(this.clazz);
    assert.equal(controllerType, ControllerType.HTTP, 'invalidate controller type');
    const httpPath = HTTPInfoUtil.getHTTPPath(this.clazz);
    const httpMiddlewares = ControllerInfoUtil.getControllerMiddlewares(this.clazz);
    const methods = this.buildMethod();
    const clazzName = this.clazz.name;
    const controllerName = ControllerInfoUtil.getControllerName(this.clazz) || clazzName;
    const property = PrototypeUtil.getProperty(this.clazz);
    const protoName = property!.name as string;
    const needAcl = ControllerInfoUtil.hasControllerAcl(this.clazz);
    const aclCode = ControllerInfoUtil.getControllerAcl(this.clazz);
    const hosts = ControllerInfoUtil.getControllerHosts(this.clazz);
    const metadata = new HTTPControllerMeta(
      clazzName,
      protoName,
      controllerName,
      httpPath,
      httpMiddlewares,
      methods,
      needAcl,
      aclCode,
      hosts
    );
    ControllerMetadataUtil.setControllerMetadata(this.clazz, metadata);
    for (const method of metadata.methods) {
      const realPath = metadata.getMethodRealPath(method);
      if (!realPath.startsWith('/')) {
        const desc = ClassUtil.classDescription(this.clazz);
        throw new Error(`class ${desc} method ${method.name} path ${realPath} not start with /`);
      }
    }
    return metadata;
  }

  static create(clazz: EggProtoImplClass) {
    return new HTTPControllerMetaBuilder(clazz);
  }
}

ControllerMetaBuilderFactory.registerControllerMetaBuilder(ControllerType.HTTP, HTTPControllerMetaBuilder.create);
