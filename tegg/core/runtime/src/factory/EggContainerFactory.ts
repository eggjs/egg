import { debuglog } from 'node:util';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { EggPrototypeFactory } from '@eggjs/metadata';
import { NameUtil } from '@eggjs/tegg-common-util';
import type {
  ContainerGetMethod,
  EggContainer,
  EggObject,
  EggObjectName,
  EggProtoImplClass,
  EggPrototype,
  LifecycleContext,
  ObjectInitTypeLike,
  QualifierInfo,
} from '@eggjs/tegg-types';

import type { ContextInitiator as ContextInitiatorType } from '../impl/ContextInitiator.ts';
import { ContextHandler } from '../model/ContextHandler.ts';

const debug = debuglog('tegg/core/runtime/EggContainerFactory');

export class EggContainerFactory {
  private static containerGetMethodMap: Map<ObjectInitTypeLike, ContainerGetMethod> = new Map();
  private static ContextInitiatorClass: typeof ContextInitiatorType;

  static registerContainerGetMethod(initType: ObjectInitTypeLike, method: ContainerGetMethod): void {
    if (debug.enabled) {
      debug(
        'registerContainerGetMethod %o %o, exists: %s',
        initType,
        method.toString(),
        this.containerGetMethodMap.has(initType),
      );
    }
    this.containerGetMethodMap.set(initType, method);
  }

  static getContainer(proto: EggPrototype): EggContainer<LifecycleContext> {
    const method = this.containerGetMethodMap.get(proto.initType);
    if (!method) {
      throw new Error(`InitType ${proto.initType} has not register ContainerGetMethod`);
    }
    return method(proto);
  }

  /**
   * get or create egg object
   * If get singleton egg object in context,
   * will create context egg object for it.
   */
  static async getOrCreateEggObject(proto: EggPrototype, name?: EggObjectName): Promise<EggObject> {
    const container = this.getContainer(proto);
    name = name || proto.name;
    const obj = await container.getOrCreateEggObject(name, proto);
    const ctx = ContextHandler.getContext();
    if (ctx) {
      if (!EggContainerFactory.ContextInitiatorClass) {
        // Dependency cycle between ContextInitiator and EggContainerFactory
        const { ContextInitiator } = await import('../impl/ContextInitiator.js');
        debug('import ContextInitiator to fix dependency cycle');
        EggContainerFactory.ContextInitiatorClass = ContextInitiator;
      }
      const initiator = EggContainerFactory.ContextInitiatorClass.createContextInitiator(ctx);
      await initiator.init(obj);
      debug('getOrCreateEggObject with context eggObject:%o, from proto:%o, name:%s', obj.name, proto.name, name);
    } else {
      debug(
        'getOrCreateEggObject without context, get eggObject:%o, from proto:%o, name:%s',
        obj.name,
        proto.name,
        name,
      );
    }
    return obj;
  }

  /**
   * get or create egg object from the Class
   * If get singleton egg object in context,
   * will create context egg object for it.
   */
  static async getOrCreateEggObjectFromClazz(
    clazz: EggProtoImplClass,
    name?: EggObjectName,
    qualifiers?: QualifierInfo[],
  ): Promise<EggObject> {
    let proto = PrototypeUtil.getClazzProto(clazz as EggProtoImplClass) as EggPrototype | undefined;
    const isMultiInstance = PrototypeUtil.isEggMultiInstancePrototype(clazz as EggProtoImplClass);
    debug('getOrCreateEggObjectFromClazz:%o, isMultiInstance:%s, proto:%o', clazz.name, isMultiInstance, !!proto);
    if (isMultiInstance) {
      const defaultName = NameUtil.getClassName(clazz as EggProtoImplClass);
      name = name ?? defaultName;
      proto = EggPrototypeFactory.instance.getPrototype(name, undefined, qualifiers);
    } else if (proto) {
      name = name ?? proto.name;
    }
    if (!proto) {
      debug(
        'getOrCreateEggObjectFromClazz:%o not found, eggObjectName:%s, qualifiers:%o, proto:%o, isMultiInstance:%s',
        clazz.name,
        name,
        qualifiers,
        proto,
        isMultiInstance,
      );
      throw new Error(`can not get proto for clazz ${clazz.name}`);
    }
    return await this.getOrCreateEggObject(proto, name);
  }

  /**
   * get or create egg object from the Name
   * If get singleton egg object in context,
   * will create context egg object for it.
   */
  static async getOrCreateEggObjectFromName(name: EggObjectName, qualifiers?: QualifierInfo[]): Promise<EggObject> {
    const proto = EggPrototypeFactory.instance.getPrototype(name, undefined, qualifiers);
    if (!proto) {
      throw new Error(`can not get proto for clazz ${String(name)}`);
    }
    return await this.getOrCreateEggObject(proto, name);
  }

  static getEggObject(proto: EggPrototype, name?: EggObjectName): EggObject {
    const container = this.getContainer(proto);
    name = name || proto.name;
    return container.getEggObject(name, proto);
  }
}
