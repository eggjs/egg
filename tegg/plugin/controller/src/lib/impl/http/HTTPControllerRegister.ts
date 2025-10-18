import assert from 'node:assert/strict';

import { Application, Router } from 'egg';
import {
  CONTROLLER_META_DATA,
  type ControllerMetadata,
  ControllerType,
  HTTPControllerMeta,
  HTTPMethodMeta,
} from '@eggjs/tegg';
import { type EggPrototype } from '@eggjs/tegg-metadata';
import { EggContainerFactory } from '@eggjs/tegg-runtime';

import { type ControllerRegister } from '../../ControllerRegister.ts';
import { HTTPMethodRegister } from './HTTPMethodRegister.ts';
import { RootProtoManager } from '../../RootProtoManager.ts';

export class HTTPControllerRegister implements ControllerRegister {
  static instance?: HTTPControllerRegister;

  private readonly router: Router;
  private readonly checkRouters: Map<string, Router>;
  private readonly eggContainerFactory: typeof EggContainerFactory;
  private controllerProtos: EggPrototype[] = [];

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata, app: Application) {
    assert(controllerMeta.type === ControllerType.HTTP, 'controller meta type is not HTTP');
    if (!HTTPControllerRegister.instance) {
      HTTPControllerRegister.instance = new HTTPControllerRegister(app.router, app.eggContainerFactory);
    }
    HTTPControllerRegister.instance.controllerProtos.push(proto);
    return HTTPControllerRegister.instance;
  }

  constructor(router: Router, eggContainerFactory: typeof EggContainerFactory) {
    this.router = router;
    this.checkRouters = new Map();
    this.checkRouters.set('default', router);
    this.eggContainerFactory = eggContainerFactory;
  }

  register(): Promise<void> {
    // do noting
    return Promise.resolve();
  }

  static clean() {
    if (this.instance) {
      this.instance.controllerProtos = [];
      this.instance.checkRouters.clear();
    }
    this.instance = undefined;
  }

  doRegister(rootProtoManager: RootProtoManager) {
    const methodMap = new Map<HTTPMethodMeta, EggPrototype>();
    for (const proto of this.controllerProtos) {
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as HTTPControllerMeta;
      for (const method of metadata.methods) {
        methodMap.set(method, proto);
      }
    }
    const allMethods = Array.from(methodMap.keys()).sort((a, b) => b.priority - a.priority);

    for (const method of allMethods) {
      const controllerProto = methodMap.get(method)!;
      const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as HTTPControllerMeta;
      const methodRegister = new HTTPMethodRegister(
        controllerProto,
        controllerMeta,
        method,
        this.router,
        this.checkRouters,
        this.eggContainerFactory
      );
      methodRegister.checkDuplicate();
    }

    for (const method of allMethods) {
      const controllerProto = methodMap.get(method)!;
      const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as HTTPControllerMeta;
      const methodRegister = new HTTPMethodRegister(
        controllerProto,
        controllerMeta,
        method,
        this.router,
        this.checkRouters,
        this.eggContainerFactory
      );
      methodRegister.register(rootProtoManager);
    }
  }
}
