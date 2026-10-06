import { IdenticalUtil } from '@eggjs/lifecycle';
import { EggInnerObjectPrototypeImpl, LoadUnitFactory } from '@eggjs/metadata';
import type {
  EggObject,
  EggObjectLifecycle,
  EggObjectLifeCycleContext,
  EggObjectName,
  EggPrototype,
  LifecycleHookName,
  ObjectInfo,
  QualifierInfo,
} from '@eggjs/tegg-types';
import { EggObjectStatus, InjectType, ObjectInitType } from '@eggjs/tegg-types';

import { EggContainerFactory } from '../factory/EggContainerFactory.ts';
import { EggObjectFactory } from '../factory/EggObjectFactory.ts';
import { ContextHandler } from '../model/ContextHandler.ts';
import { EggObjectLifecycleUtil } from '../model/EggObject.ts';
import { EggObjectUtil } from './EggObjectUtil.ts';

/**
 * EggObject implementation for inner object / lifecycle protos.
 *
 * A lifecycle proto implements hook-callback methods (e.g. `postCreate`,
 * `preDestroy`) whose names collide with the object's own lifecycle interface
 * methods. To avoid invoking hook callbacks as self lifecycle by accident,
 * this implementation only runs self lifecycle methods that were explicitly
 * declared via decorators (`@LifecyclePostInject`, `@LifecycleInit`, ...) —
 * unlike EggObjectImpl, interface method names are never used as fallback.
 */
export class EggInnerObjectImpl implements EggObject {
  private _obj: object;
  private status: EggObjectStatus = EggObjectStatus.PENDING;

  readonly proto: EggPrototype;
  readonly name: EggObjectName;
  readonly id: string;

  constructor(name: EggObjectName, proto: EggPrototype) {
    this.name = name;
    this.proto = proto;
    const ctx = ContextHandler.getContext();
    this.id = IdenticalUtil.createObjectId(this.proto.id, ctx?.id);
  }

  async initWithInjectProperty(ctx: EggObjectLifeCycleContext): Promise<void> {
    // 1. create obj
    // 2. call obj lifecycle preCreate
    // 3. inject deps
    // 4. call obj lifecycle postCreate
    // 5. success create
    try {
      this._obj = this.proto.constructEggObject();

      // global hook
      await EggObjectLifecycleUtil.objectPreCreate(ctx, this);
      // self hook
      await this.callObjectLifecycle('postConstruct', ctx);

      await this.callObjectLifecycle('preInject', ctx);
      await Promise.all(
        this.proto.injectObjects.map(async (injectObject) => {
          const proto = injectObject.proto;
          const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
          if (!loadUnit) {
            throw new Error(`can not find load unit: ${proto.loadUnitId}`);
          }
          if (
            this.proto.initType !== ObjectInitType.CONTEXT &&
            injectObject.proto.initType === ObjectInitType.CONTEXT
          ) {
            this.injectProperty(
              injectObject.refName,
              EggObjectUtil.contextEggObjectGetProperty(proto, injectObject.objName),
            );
          } else {
            const injectObj = await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
            this.injectProperty(injectObject.refName, EggObjectUtil.eggObjectGetProperty(injectObj));
          }
        }),
      );

      // global hook
      await EggObjectLifecycleUtil.objectPostCreate(ctx, this);

      // self hook
      await this.callObjectLifecycle('postInject', ctx);

      await this.callObjectLifecycle('init', ctx);

      this.status = EggObjectStatus.READY;
    } catch (e) {
      this.status = EggObjectStatus.ERROR;
      throw e;
    }
  }

  async initWithInjectConstructor(ctx: EggObjectLifeCycleContext): Promise<void> {
    // 1. create inject deps
    // 2. create obj
    // 3. call obj lifecycle preCreate
    // 4. call obj lifecycle postCreate
    // 5. success create
    try {
      const constructArgs: any[] = await Promise.all(
        this.proto.injectObjects!.map(async (injectObject) => {
          const proto = injectObject.proto;
          const loadUnit = LoadUnitFactory.getLoadUnitById(proto.loadUnitId);
          if (!loadUnit) {
            throw new Error(`can not find load unit: ${proto.loadUnitId}`);
          }
          if (
            this.proto.initType !== ObjectInitType.CONTEXT &&
            injectObject.proto.initType === ObjectInitType.CONTEXT
          ) {
            return EggObjectUtil.contextEggObjectProxy(proto, injectObject.objName);
          }
          const injectObj = await EggContainerFactory.getOrCreateEggObject(proto, injectObject.objName);
          return EggObjectUtil.eggObjectProxy(injectObj);
        }),
      );
      if (typeof this.proto.multiInstanceConstructorIndex !== 'undefined') {
        const qualifiers =
          this.proto.multiInstanceConstructorAttributes
            ?.map((t) => {
              return {
                attribute: t,
                value: this.proto.getQualifier(t),
              } as QualifierInfo;
            })
            ?.filter((t) => typeof t.value !== 'undefined') ?? [];
        const objInfo: ObjectInfo = {
          name: this.proto.name,
          qualifiers,
        };
        constructArgs.splice(this.proto.multiInstanceConstructorIndex, 0, objInfo);
      }

      this._obj = this.proto.constructEggObject(...constructArgs);

      // global hook
      await EggObjectLifecycleUtil.objectPreCreate(ctx, this);
      // self hook
      await this.callObjectLifecycle('postConstruct', ctx);

      await this.callObjectLifecycle('preInject', ctx);

      // global hook
      await EggObjectLifecycleUtil.objectPostCreate(ctx, this);

      // self hook
      await this.callObjectLifecycle('postInject', ctx);

      await this.callObjectLifecycle('init', ctx);

      this.status = EggObjectStatus.READY;
    } catch (e) {
      this.status = EggObjectStatus.ERROR;
      throw e;
    }
  }

  async init(ctx: EggObjectLifeCycleContext): Promise<void> {
    if (this.proto.injectType === InjectType.CONSTRUCTOR) {
      await this.initWithInjectConstructor(ctx);
    } else {
      await this.initWithInjectProperty(ctx);
    }
  }

  async destroy(ctx: EggObjectLifeCycleContext): Promise<void> {
    if (this.status === EggObjectStatus.READY) {
      this.status = EggObjectStatus.DESTROYING;
      await EggObjectLifecycleUtil.objectPreDestroy(ctx, this);
      await this.callObjectLifecycle('preDestroy', ctx);
      await this.callObjectLifecycle('destroy', ctx);

      this.status = EggObjectStatus.DESTROYED;
    }
  }

  injectProperty(name: EggObjectName, descriptor: PropertyDescriptor): void {
    Reflect.defineProperty(this._obj, name, descriptor);
  }

  get obj(): object {
    return this._obj;
  }

  get isReady(): boolean {
    return this.status === EggObjectStatus.READY;
  }

  /**
   * Only run self lifecycle methods declared through decorators — never fall
   * back to the lifecycle interface method name (it may be a hook callback).
   */
  private async callObjectLifecycle(hookName: LifecycleHookName, ctx: EggObjectLifeCycleContext): Promise<void> {
    const objLifecycleHook = this._obj as EggObjectLifecycle;
    const lifecycleMethod = EggObjectLifecycleUtil.getLifecycleHook(hookName, this.proto);
    if (lifecycleMethod) {
      await objLifecycleHook[lifecycleMethod]?.(ctx, this);
    }
  }

  static async createObject(
    name: EggObjectName,
    proto: EggPrototype,
    lifecycleContext: EggObjectLifeCycleContext,
  ): Promise<EggInnerObjectImpl> {
    const obj = new EggInnerObjectImpl(name, proto);
    await obj.init(lifecycleContext);
    return obj;
  }
}

EggObjectFactory.registerEggObjectCreateMethod(EggInnerObjectPrototypeImpl, EggInnerObjectImpl.createObject);
