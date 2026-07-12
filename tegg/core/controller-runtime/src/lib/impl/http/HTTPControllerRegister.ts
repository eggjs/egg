import { CONTROLLER_META_DATA, type HTTPControllerMeta, type HTTPMethodMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import type { Router } from '@eggjs/router';
import type { EggContainerFactory } from '@eggjs/tegg-runtime';

import type { ControllerRegister } from '../../ControllerRegister.ts';
import type { RootProtoManager } from '../../RootProtoManager.ts';
import type { HTTPMethodRegister } from './HTTPMethodRegister.ts';

export type HTTPMethodRegisterCreator = (
  proto: EggPrototype,
  controllerMeta: HTTPControllerMeta,
  methodMeta: HTTPMethodMeta,
  router: Router,
  checkRouters: Map<string, Router>,
  eggContainerFactory: typeof EggContainerFactory,
) => HTTPMethodRegister;

/**
 * Host-agnostic HTTP controller registration skeleton: accumulate controller
 * protos while load units are created, then `doRegister()` wires all methods
 * onto the router in priority order (a duplicate-check pass, then the real
 * registration pass). Hosts subclass/instantiate with their own router and
 * method-register creator (i.e. their param-binding strategy).
 */
export class HTTPControllerRegister implements ControllerRegister {
  protected readonly router: Router;
  protected readonly checkRouters: Map<string, Router>;
  protected readonly eggContainerFactory: typeof EggContainerFactory;
  protected readonly methodRegisterCreator: HTTPMethodRegisterCreator;
  protected controllerProtos: EggPrototype[] = [];

  constructor(
    router: Router,
    eggContainerFactory: typeof EggContainerFactory,
    methodRegisterCreator: HTTPMethodRegisterCreator,
  ) {
    this.router = router;
    this.checkRouters = new Map();
    this.checkRouters.set('default', router);
    this.eggContainerFactory = eggContainerFactory;
    this.methodRegisterCreator = methodRegisterCreator;
  }

  addControllerProto(proto: EggPrototype): void {
    this.controllerProtos.push(proto);
  }

  register(): Promise<void> {
    // do noting
    return Promise.resolve();
  }

  clear(): void {
    this.controllerProtos = [];
    this.checkRouters.clear();
  }

  doRegister(rootProtoManager: RootProtoManager): void {
    const methodMap = new Map<HTTPMethodMeta, EggPrototype>();
    for (const proto of this.controllerProtos) {
      const metadata = proto.getMetaData(CONTROLLER_META_DATA) as HTTPControllerMeta;
      for (const method of metadata.methods) {
        methodMap.set(method, proto);
      }
    }
    const allMethods = Array.from(methodMap.keys()).sort((a, b) => b.priority - a.priority);

    // FIXME: why init method register twice?
    for (const method of allMethods) {
      const controllerProto = methodMap.get(method)!;
      const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as HTTPControllerMeta;
      const methodRegister = this.methodRegisterCreator(
        controllerProto,
        controllerMeta,
        method,
        this.router,
        this.checkRouters,
        this.eggContainerFactory,
      );
      methodRegister.checkDuplicate();
    }

    for (const method of allMethods) {
      const controllerProto = methodMap.get(method)!;
      const controllerMeta = controllerProto.getMetaData(CONTROLLER_META_DATA) as HTTPControllerMeta;
      const methodRegister = this.methodRegisterCreator(
        controllerProto,
        controllerMeta,
        method,
        this.router,
        this.checkRouters,
        this.eggContainerFactory,
      );
      // Error: framework.RouterConflictError: register http controller GET AppController2.get failed, GET /apps/:id is conflict with exists rule /apps/:id [ https://eggjs.org/faq/TEGG_ROUTER_CONFLICT ]
      // methodRegister.checkDuplicate();
      methodRegister.register(rootProtoManager);
    }
  }
}
