import type { EggObject, EggPrototype } from '@eggjs/tegg-types';

import { EggContainerFactory } from '../factory/EggContainerFactory.ts';

export class EggObjectUtil {
  static eggObjectGetProperty(eggObject: EggObject): PropertyDescriptor {
    return {
      get(): any {
        return eggObject.obj;
      },
      configurable: true,
      enumerable: true,
    };
  }

  static contextEggObjectGetProperty(proto: EggPrototype, objName: PropertyKey): PropertyDescriptor {
    const PROTO_OBJ_GETTER = Symbol(`EggPrototype#objGetter#${String(objName)}`);
    if (!proto[PROTO_OBJ_GETTER]) {
      proto[PROTO_OBJ_GETTER] = {
        get(): any {
          const eggObject = EggContainerFactory.getEggObject(proto, objName);
          return eggObject.obj;
        },
        configurable: true,
        enumerable: true,
      };
    }
    return proto[PROTO_OBJ_GETTER];
  }

  static eggObjectProxy(eggObject: EggObject): PropertyDescriptor {
    let _obj: object;
    function getObj(): Record<string | symbol, any> {
      if (!_obj) {
        _obj = eggObject.obj;
      }
      return _obj;
    }

    const proxy = new Proxy(
      {},
      {
        defineProperty(_target: {}, property: string | symbol, attributes: PropertyDescriptor): boolean {
          const obj = getObj();
          Object.defineProperty(obj, property, attributes);
          return true;
        },
        deleteProperty(_target: any, p: string | symbol): boolean {
          const obj = getObj();
          delete obj[p];
          return true;
        },
        get(target: any, p: string | symbol): any {
          // make get be lazy
          if (p === 'then') return;
          if ((Object.prototype as any)[p]) {
            return target[p];
          }
          const obj = getObj();
          const val = obj[p];
          if (typeof val === 'function') {
            return val.bind(obj);
          }
          return val;
        },
        getOwnPropertyDescriptor(_target: any, p: string | symbol): PropertyDescriptor | undefined {
          const obj = getObj();
          return Object.getOwnPropertyDescriptor(obj, p);
        },
        getPrototypeOf(): object | null {
          const obj = getObj();
          return Object.getPrototypeOf(obj);
        },
        has(_target: any, p: string | symbol): boolean {
          const obj = getObj();
          return p in obj;
        },
        isExtensible(): boolean {
          const obj = getObj();
          return Object.isExtensible(obj);
        },
        ownKeys(): ArrayLike<string | symbol> {
          const obj = getObj();
          return Reflect.ownKeys(obj);
        },
        preventExtensions(): boolean {
          const obj = getObj();
          Object.preventExtensions(obj);
          return true;
        },
        set(_target: any, p: string | symbol, newValue: any): boolean {
          const obj = getObj();
          obj[p] = newValue;
          return true;
        },
        setPrototypeOf(_target: any, v: object | null): boolean {
          const obj = getObj();
          Object.setPrototypeOf(obj, v);
          return true;
        },
      }
    );
    return proxy;
  }

  static contextEggObjectProxy(proto: EggPrototype, objName: PropertyKey): PropertyDescriptor {
    const PROTO_OBJ_PROXY = Symbol(`EggPrototype#objProxy#${String(objName)}`);
    if (!proto[PROTO_OBJ_PROXY]) {
      proto[PROTO_OBJ_PROXY] = new Proxy(
        {},
        {
          defineProperty(_target: any, property: string | symbol, attributes: PropertyDescriptor): boolean {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            Object.defineProperty(obj, property, attributes);
            return true;
          },
          deleteProperty(_target: any, p: string | symbol): boolean {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            delete obj[p];
            return true;
          },
          get(target: any, p: string | symbol): any {
            // make get be lazy
            if (p === 'then') return;
            if ((Object.prototype as any)[p]) {
              return target[p];
            }
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            return obj[p];
          },
          getOwnPropertyDescriptor(_target: any, p: string | symbol): PropertyDescriptor | undefined {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            return Object.getOwnPropertyDescriptor(obj, p);
          },
          getPrototypeOf(): object | null {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            return Object.getPrototypeOf(obj);
          },
          has(_target: any, p: string | symbol): boolean {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            return p in obj;
          },
          isExtensible(): boolean {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            return Object.isExtensible(obj);
          },
          ownKeys(): ArrayLike<string | symbol> {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            return Reflect.ownKeys(obj);
          },
          preventExtensions(): boolean {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            Object.preventExtensions(obj);
            return true;
          },
          set(_target: any, p: string | symbol, newValue: any): boolean {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            obj[p] = newValue;
            return true;
          },
          setPrototypeOf(_target: any, v: object | null): boolean {
            const eggObject = EggContainerFactory.getEggObject(proto, objName);
            const obj = eggObject.obj;
            Object.setPrototypeOf(obj, v);
            return true;
          },
        }
      );
    }
    return proto[PROTO_OBJ_PROXY];
  }
}
