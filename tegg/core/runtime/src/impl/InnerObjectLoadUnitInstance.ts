import { PrototypeUtil } from '@eggjs/core-decorator';
import type { LifecycleUtil } from '@eggjs/lifecycle';
import { EggPrototypeLifecycleUtil, LoadUnitLifecycleUtil } from '@eggjs/metadata';
import type {
  EggLifecycleInfo,
  EggObject,
  EggPrototype,
  EggPrototypeName,
  LoadUnitInstance,
  LoadUnitInstanceLifecycleContext,
} from '@eggjs/tegg-types';

import { EggObjectFactory } from '../factory/EggObjectFactory.ts';
import { LoadUnitInstanceFactory } from '../factory/LoadUnitInstanceFactory.ts';
import { EggContextLifecycleUtil } from '../model/EggContext.ts';
import { EggObjectLifecycleUtil } from '../model/EggObject.ts';
import { LoadUnitInstanceLifecycleUtil } from '../model/LoadUnitInstance.ts';
import { INNER_OBJECT_LOAD_UNIT_TYPE } from './InnerObjectLoadUnit.ts';
import { ModuleLoadUnitInstance } from './ModuleLoadUnitInstance.ts';

/**
 * Instantiates all inner objects of an InnerObjectLoadUnit and auto-registers
 * every `@XxxLifecycleProto` object into the lifecycle util matching its
 * declared type. Deletion is symmetric on destroy.
 *
 * The lifecycle utils below are scope-aware, so running init/destroy inside
 * the host's TeggScope keeps registrations per-app.
 */
export class InnerObjectLoadUnitInstance extends ModuleLoadUnitInstance {
  static readonly LifecycleUtils: Record<string, LifecycleUtil<any, any>> = {
    LoadUnit: LoadUnitLifecycleUtil,
    LoadUnitInstance: LoadUnitInstanceLifecycleUtil,
    EggPrototype: EggPrototypeLifecycleUtil,
    EggObject: EggObjectLifecycleUtil,
    EggContext: EggContextLifecycleUtil,
  };

  readonly #lifecycleObjects: [string, object][] = [];
  readonly #createdObjects: EggObject[] = [];
  readonly #createdObjectIds = new Set<string>();

  override async getOrCreateEggObject(name: EggPrototypeName, proto: EggPrototype): Promise<EggObject> {
    const object = await super.getOrCreateEggObject(name, proto);
    if (!this.#createdObjectIds.has(object.id)) {
      this.#createdObjectIds.add(object.id);
      this.#createdObjects.push(object);
    }
    return object;
  }

  async init(ctx: LoadUnitInstanceLifecycleContext): Promise<void> {
    await super.init(ctx);

    for (const [name, proto] of this.iterateProtoToCreate()) {
      const isLifecycleProto = proto.getMetaData<boolean>(PrototypeUtil.IS_EGG_LIFECYCLE_PROTOTYPE);
      const lifecycleInfo = proto.getMetaData<EggLifecycleInfo>(PrototypeUtil.EGG_LIFECYCLE_PROTOTYPE_METADATA);
      if (isLifecycleProto && lifecycleInfo?.type) {
        const lifecycleUtil = InnerObjectLoadUnitInstance.LifecycleUtils[lifecycleInfo.type];
        if (!lifecycleUtil) {
          throw new Error(
            `register lifecycle for ${String(proto.name)} failed, unknown lifecycle type ${lifecycleInfo.type}`,
          );
        }
        const lifecycle = this.getEggObject(name, proto).obj;
        lifecycleUtil.registerLifecycle(lifecycle);
        this.#lifecycleObjects.push([lifecycleInfo.type, lifecycle]);
      }
    }
  }

  async destroy(): Promise<void> {
    let toBeDeleted = this.#lifecycleObjects.pop();
    while (toBeDeleted) {
      const [type, lifecycle] = toBeDeleted;
      InnerObjectLoadUnitInstance.LifecycleUtils[type]?.deleteLifecycle(lifecycle);
      toBeDeleted = this.#lifecycleObjects.pop();
    }

    this.eggObjectMap.clear();
    this.eggObjectPromiseMap.clear();

    let object = this.#createdObjects.pop();
    while (object) {
      await EggObjectFactory.destroyObject(object);
      this.#createdObjectIds.delete(object.id);
      object = this.#createdObjects.pop();
    }
  }

  static createInnerObjectLoadUnitInstance(ctx: LoadUnitInstanceLifecycleContext): LoadUnitInstance {
    return new InnerObjectLoadUnitInstance(ctx.loadUnit);
  }
}

LoadUnitInstanceFactory.registerLoadUnitInstanceClass(
  INNER_OBJECT_LOAD_UNIT_TYPE,
  InnerObjectLoadUnitInstance.createInnerObjectLoadUnitInstance,
);
