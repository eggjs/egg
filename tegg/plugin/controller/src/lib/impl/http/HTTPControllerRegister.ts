import assert from 'node:assert/strict';

import { type ControllerMetadata, ControllerType } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { EggContainerFactory } from '@eggjs/tegg-runtime';
import { TeggScope } from '@eggjs/tegg-types';
import type { Application, Router } from 'egg';

import { HTTPControllerRegister as BaseHTTPControllerRegister } from './HTTPControllerRegisterBase.ts';
import { HTTPMethodRegister } from './HTTPMethodRegister.ts';

const HTTP_CONTROLLER_REGISTER_SLOT = Symbol('tegg:controller:httpControllerRegister');

export class HTTPControllerRegister extends BaseHTTPControllerRegister {
  // Per-app: the register accumulates protos and binds to one app's router, so
  // it must be per-app (resolved from the active TeggScope bag).
  static get instance(): HTTPControllerRegister | undefined {
    return TeggScope.getOr(HTTP_CONTROLLER_REGISTER_SLOT, () => undefined, 'HTTPControllerRegister.instance');
  }

  static set instance(value: HTTPControllerRegister | undefined) {
    TeggScope.set(HTTP_CONTROLLER_REGISTER_SLOT, value);
  }

  static create(proto: EggPrototype, controllerMeta: ControllerMetadata, app: Application): HTTPControllerRegister {
    assert(controllerMeta.type === ControllerType.HTTP, 'controller meta type is not HTTP');
    if (!HTTPControllerRegister.instance) {
      // Import the container factory directly: `app` may arrive through the
      // inject proxy, whose property reads bind function values — a bound
      // class loses its statics.
      HTTPControllerRegister.instance = new HTTPControllerRegister(app.router, EggContainerFactory);
    }
    HTTPControllerRegister.instance.addControllerProto(proto);
    return HTTPControllerRegister.instance;
  }

  constructor(router: Router, eggContainerFactory: typeof EggContainerFactory) {
    super(
      router,
      eggContainerFactory,
      (proto, controllerMeta, methodMeta, methodRouter, checkRouters, containerFactory) =>
        new HTTPMethodRegister(proto, controllerMeta, methodMeta, methodRouter, checkRouters, containerFactory),
    );
  }

  static clean(): void {
    if (this.instance) {
      this.instance.clear();
    }
    this.instance = undefined;
  }
}
