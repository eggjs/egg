import type { Application, Context } from 'egg';
import { type EggPrototype, EggPrototypeFactory } from '@eggjs/metadata';
import { InitTypeQualifierAttribute, ObjectInitType } from '@eggjs/core-decorator';
import { EggContainerFactory, type LoadUnitInstance } from '@eggjs/tegg-runtime';
import { ProxyUtil } from '@eggjs/tegg-common-util';

export class CompatibleUtil {
  static singletonProtoCache: Map<PropertyKey, EggPrototype> = new Map();
  static requestProtoCache: Map<PropertyKey, EggPrototype> = new Map();

  static getSingletonProto(name: PropertyKey): EggPrototype {
    if (!this.singletonProtoCache.has(name)) {
      const proto = EggPrototypeFactory.instance.getPrototype(name, undefined, [
        {
          attribute: InitTypeQualifierAttribute,
          value: ObjectInitType.SINGLETON,
        },
      ]);
      this.singletonProtoCache.set(name, proto);
    }
    return this.singletonProtoCache.get(name)!;
  }

  static getRequestProto(name: PropertyKey): EggPrototype {
    if (!this.requestProtoCache.has(name)) {
      const proto = EggPrototypeFactory.instance.getPrototype(name, undefined, [
        {
          attribute: InitTypeQualifierAttribute,
          value: ObjectInitType.CONTEXT,
        },
      ]);
      this.requestProtoCache.set(name, proto);
    }
    return this.requestProtoCache.get(name)!;
  }

  private static singletonModuleProxyFactory(app: Application, loadUnitInstance: LoadUnitInstance) {
    let deprecated = false;
    return function (_: unknown, p: PropertyKey) {
      const proto = CompatibleUtil.getSingletonProto(p);
      const eggObj = EggContainerFactory.getEggObject(proto);
      if (!deprecated) {
        deprecated = true;
        app.deprecate(
          `[egg/module] Please use await app.getEggObject(clazzName) instead of app.${loadUnitInstance.name}.${String(p)}`,
        );
      }
      return eggObj.obj;
    };
  }

  static appCompatible(app: Application, loadUnitInstance: LoadUnitInstance): void {
    const moduleLoadUnitProxy = ProxyUtil.safeProxy(
      loadUnitInstance,
      CompatibleUtil.singletonModuleProxyFactory(app, loadUnitInstance),
    );
    Reflect.defineProperty(app.module, loadUnitInstance.name, {
      configurable: true,
      value: moduleLoadUnitProxy,
    });
  }

  static contextModuleProxyFactory(holder: Record<string, any>, ctx: Context, loadUnitInstance: LoadUnitInstance): any {
    const cacheKey = `_${loadUnitInstance.name}Proxy`;
    if (!holder[cacheKey]) {
      let deprecated = false;
      const getter = function (_: unknown, p: PropertyKey) {
        const proto = CompatibleUtil.getRequestProto(p);
        const eggObj = EggContainerFactory.getEggObject(proto, p);
        if (!deprecated) {
          deprecated = true;
          ctx.app.deprecate(
            `[egg/module] Please use await ctx.getEggObject(clazzName) instead of ctx.${loadUnitInstance.name}.${String(p)}`,
          );
        }
        return eggObj.obj;
      };
      holder[cacheKey] = ProxyUtil.safeProxy(loadUnitInstance, getter);
    }
    return holder[cacheKey];
  }

  /**
   * Compatible the context module, only for koa application
   * @param contextPrototype - The prototype of the context
   * @param loadUnitInstances - The load unit instances
   */
  static contextModuleCompatible(contextPrototype: any, loadUnitInstances: LoadUnitInstance[]): void {
    const loadUnitInstanceMap = loadUnitInstances.reduce(
      (p, c) => {
        p[c.name] = c;
        return p;
      },
      {} as Record<PropertyKey, LoadUnitInstance>,
    );

    // add module property to context prototype
    // make `ctx.module` is a proxy object, when access `ctx.module.xxx`, it will return the egg object
    // TODO: will be removed in future version, should use `app.getEggObject(clazzName)` instead of `ctx.module.xxx`
    Reflect.defineProperty(contextPrototype, 'module', {
      configurable: true,
      enumerable: true,
      get(this: Context): any {
        if (!this._moduleProxy) {
          const ctxModule = Object.create(loadUnitInstanceMap);
          this._moduleProxy = ProxyUtil.safeProxy(ctxModule, (_, p: PropertyKey) => {
            const loadUnitInstance = Reflect.get(ctxModule, p);
            if (!loadUnitInstance) {
              return;
            }
            return CompatibleUtil.contextModuleProxyFactory(ctxModule, this, loadUnitInstance);
          });
        }
        return this._moduleProxy;
      },
    });
  }

  static clean(): void {
    this.singletonProtoCache.clear();
    this.requestProtoCache.clear();
  }
}
