import {
  type EggMultiInstanceCallbackPrototypeInfo,
  type EggMultiInstancePrototypeInfo,
  type EggProtoImplClass,
  type EggPrototypeInfo,
  type EggPrototypeName,
  InitTypeQualifierAttribute,
  type InjectConstructorInfo,
  type InjectObjectInfo,
  InjectType,
  LoadUnitNameQualifierAttribute,
  type MultiInstancePrototypeGetObjectsContext,
  MultiInstanceType,
  type QualifierAttribute,
} from '@eggjs/tegg-types';
import { MetadataUtil } from './MetadataUtil.ts';

export class PrototypeUtil {
  static readonly IS_EGG_OBJECT_PROTOTYPE = Symbol.for('EggPrototype#isEggPrototype');
  static readonly IS_EGG_OBJECT_MULTI_INSTANCE_PROTOTYPE = Symbol.for('EggPrototype#isEggMultiInstancePrototype');
  static readonly FILE_PATH = Symbol.for('EggPrototype.filePath');
  static readonly PROTOTYPE_PROPERTY = Symbol.for('EggPrototype.Property');
  static readonly MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY = Symbol.for('EggPrototype.MultiInstanceStaticProperty');
  static readonly MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY = Symbol.for('EggPrototype.MultiInstanceCallbackProperty');
  static readonly INJECT_OBJECT_NAME_SET = Symbol.for('EggPrototype.injectObjectNames');
  static readonly INJECT_TYPE = Symbol.for('EggPrototype.injectType');
  static readonly INJECT_CONSTRUCTOR_NAME_SET = Symbol.for('EggPrototype.injectConstructorNames');
  static readonly CLAZZ_PROTO = Symbol.for('EggPrototype.clazzProto');
  static readonly MULTI_INSTANCE_CONSTRUCTOR_INDEX = Symbol.for('EggPrototype#multiInstanceConstructorIndex');
  static readonly MULTI_INSTANCE_CONSTRUCTOR_ATTRIBUTES = Symbol.for('EggPrototype#multiInstanceConstructorAttributes');

  /**
   * Mark class is egg object prototype
   * @param {Function} clazz -
   */
  static setIsEggPrototype(clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(PrototypeUtil.IS_EGG_OBJECT_PROTOTYPE, true, clazz);
  }

  /**
   * If class is egg object prototype, return true
   * @param {Function} clazz -
   */
  static isEggPrototype(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getOwnBooleanMetaData(PrototypeUtil.IS_EGG_OBJECT_PROTOTYPE, clazz);
  }

  /**
   * Mark class is egg object multi instance prototype
   * @param {Function} clazz -
   */
  static setIsEggMultiInstancePrototype(clazz: EggProtoImplClass) {
    MetadataUtil.defineMetaData(PrototypeUtil.IS_EGG_OBJECT_MULTI_INSTANCE_PROTOTYPE, true, clazz);
  }

  /**
   * If class is egg object multi instance prototype, return true
   * @param {Function} clazz -
   */
  static isEggMultiInstancePrototype(clazz: EggProtoImplClass): boolean {
    return MetadataUtil.getOwnBooleanMetaData(PrototypeUtil.IS_EGG_OBJECT_MULTI_INSTANCE_PROTOTYPE, clazz);
  }

  /**
   * Get the type of the egg multi-instance prototype.
   * @param {Function} clazz -
   */
  static getEggMultiInstancePrototypeType(clazz: EggProtoImplClass): MultiInstanceType | undefined {
    if (!PrototypeUtil.isEggMultiInstancePrototype(clazz)) {
      return;
    }
    const metadata = MetadataUtil.getOwnMetaData<EggMultiInstancePrototypeInfo>(
      PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY,
      clazz
    );
    if (metadata) {
      return MultiInstanceType.STATIC;
    }
    return MultiInstanceType.DYNAMIC;
  }

  /**
   * set class file path
   * @param {Function} clazz -
   * @param {string} filePath -
   */
  static setFilePath(clazz: EggProtoImplClass, filePath: string) {
    MetadataUtil.defineMetaData(PrototypeUtil.FILE_PATH, filePath, clazz);
  }

  /**
   * get class file path
   * @param {Function} clazz -
   */
  static getFilePath(clazz: EggProtoImplClass): string | undefined {
    return MetadataUtil.getOwnMetaData(PrototypeUtil.FILE_PATH, clazz);
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setProperty(clazz: EggProtoImplClass, property: EggPrototypeInfo) {
    MetadataUtil.defineMetaData(PrototypeUtil.PROTOTYPE_PROPERTY, property, clazz);
  }

  /**
   * get class property
   * @param {EggProtoImplClass} clazz -
   * @return {EggPrototypeInfo} -
   */
  static getProperty(clazz: EggProtoImplClass): EggPrototypeInfo | undefined {
    return MetadataUtil.getOwnMetaData(PrototypeUtil.PROTOTYPE_PROPERTY, clazz);
  }

  static async getInitType(
    clazz: EggProtoImplClass,
    ctx: MultiInstancePrototypeGetObjectsContext
  ): Promise<string | undefined> {
    const property = PrototypeUtil.getProperty(clazz) ?? (await PrototypeUtil.getMultiInstanceProperty(clazz, ctx));
    return property?.initType;
  }

  static async getAccessLevel(
    clazz: EggProtoImplClass,
    ctx: MultiInstancePrototypeGetObjectsContext
  ): Promise<string | undefined> {
    const property = PrototypeUtil.getProperty(clazz) ?? (await PrototypeUtil.getMultiInstanceProperty(clazz, ctx));
    return property?.accessLevel;
  }

  static async getObjNames(
    clazz: EggProtoImplClass,
    ctx: MultiInstancePrototypeGetObjectsContext
  ): Promise<EggPrototypeName[]> {
    const property = PrototypeUtil.getProperty(clazz);
    if (property) {
      return [property.name];
    }
    const multiInstanceProperty = await PrototypeUtil.getMultiInstanceProperty(clazz, ctx);
    return multiInstanceProperty?.objects.map(t => t.name) || [];
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setMultiInstanceStaticProperty(clazz: EggProtoImplClass, property: EggMultiInstancePrototypeInfo) {
    MetadataUtil.defineMetaData(PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY, property, clazz);
  }

  /**
   * set class property
   * @param {EggProtoImplClass} clazz -
   * @param {EggPrototypeInfo} property -
   */
  static setMultiInstanceCallbackProperty(clazz: EggProtoImplClass, property: EggMultiInstanceCallbackPrototypeInfo) {
    MetadataUtil.defineMetaData(PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY, property, clazz);
  }

  /**
   * Get instance property of Static multi-instance prototype.
   * @param {EggProtoImplClass} clazz -
   */
  static getStaticMultiInstanceProperty(clazz: EggProtoImplClass): EggMultiInstancePrototypeInfo | undefined {
    const metadata = MetadataUtil.getOwnMetaData<EggMultiInstancePrototypeInfo>(
      PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY,
      clazz
    );
    if (metadata) {
      return metadata;
    }
  }

  /**
   * Get instance property of Dynamic multi-instance prototype.
   * @param {EggProtoImplClass} clazz -
   * @param {MultiInstancePrototypeGetObjectsContext} ctx -
   */
  static async getDynamicMultiInstanceProperty(
    clazz: EggProtoImplClass,
    ctx: MultiInstancePrototypeGetObjectsContext
  ): Promise<EggMultiInstancePrototypeInfo | undefined> {
    const callBackMetadata = MetadataUtil.getOwnMetaData<EggMultiInstanceCallbackPrototypeInfo>(
      PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY,
      clazz
    );
    if (callBackMetadata) {
      const objects = await callBackMetadata.getObjects(ctx);
      return {
        ...callBackMetadata,
        objects,
      };
    }
  }

  /**
   * get class property
   * @param {EggProtoImplClass} clazz -
   * @param {MultiInstancePrototypeGetObjectsContext} ctx -
   */
  static async getMultiInstanceProperty(
    clazz: EggProtoImplClass,
    ctx: MultiInstancePrototypeGetObjectsContext
  ): Promise<EggMultiInstancePrototypeInfo | undefined> {
    const metadata = MetadataUtil.getOwnMetaData<EggMultiInstancePrototypeInfo>(
      PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_STATIC_PROPERTY,
      clazz
    );
    if (metadata) {
      return metadata;
    }
    const callBackMetadata = MetadataUtil.getOwnMetaData<EggMultiInstanceCallbackPrototypeInfo>(
      PrototypeUtil.MULTI_INSTANCE_PROTOTYPE_CALLBACK_PROPERTY,
      clazz
    );
    if (callBackMetadata) {
      const objects = await callBackMetadata.getObjects(ctx);
      // TODO delete in next major version, default qualifier be added in ProtoDescriptorHelper.addDefaultQualifier
      const defaultQualifier = [
        {
          attribute: InitTypeQualifierAttribute,
          value: callBackMetadata.initType,
        },
        {
          attribute: LoadUnitNameQualifierAttribute,
          value: ctx.moduleName,
        },
      ];
      for (const object of objects) {
        defaultQualifier.forEach(qualifier => {
          if (!object.qualifiers.find(t => t.attribute === qualifier.attribute)) {
            object.qualifiers.push(qualifier);
          }
        });
      }
      return {
        ...callBackMetadata,
        objects,
      };
    }
  }

  static setMultiInstanceConstructorAttributes(clazz: EggProtoImplClass, attributes: QualifierAttribute[]) {
    MetadataUtil.defineMetaData(PrototypeUtil.MULTI_INSTANCE_CONSTRUCTOR_ATTRIBUTES, attributes, clazz);
  }

  static getMultiInstanceConstructorAttributes(clazz: EggProtoImplClass): QualifierAttribute[] {
    return MetadataUtil.getMetaData(PrototypeUtil.MULTI_INSTANCE_CONSTRUCTOR_ATTRIBUTES, clazz) || [];
  }

  static setMultiInstanceConstructorIndex(clazz: EggProtoImplClass, index: number) {
    MetadataUtil.defineMetaData(PrototypeUtil.MULTI_INSTANCE_CONSTRUCTOR_INDEX, index, clazz);
  }

  static getMultiInstanceConstructorIndex(clazz: EggProtoImplClass): number | undefined {
    return MetadataUtil.getMetaData(PrototypeUtil.MULTI_INSTANCE_CONSTRUCTOR_INDEX, clazz);
  }

  static setInjectType(clazz: EggProtoImplClass, type: InjectType) {
    const injectType: InjectType | undefined = MetadataUtil.getMetaData(PrototypeUtil.INJECT_TYPE, clazz);
    if (!injectType) {
      MetadataUtil.defineMetaData(PrototypeUtil.INJECT_TYPE, type, clazz);
    } else if (injectType !== type) {
      throw new Error(`class ${clazz.name} already use inject type ${injectType} can not use ${type}`);
    }
  }

  static addInjectObject(clazz: EggProtoImplClass, injectObject: InjectObjectInfo) {
    const objs: InjectObjectInfo[] = MetadataUtil.initOwnArrayMetaData(PrototypeUtil.INJECT_OBJECT_NAME_SET, clazz, []);
    objs.push(injectObject);
    MetadataUtil.defineMetaData(PrototypeUtil.INJECT_OBJECT_NAME_SET, objs, clazz);
  }

  static addInjectConstructor(clazz: EggProtoImplClass, injectConstructorInfo: InjectConstructorInfo) {
    const objs: InjectConstructorInfo[] = MetadataUtil.initArrayMetaData(
      PrototypeUtil.INJECT_CONSTRUCTOR_NAME_SET,
      clazz,
      []
    );
    objs.push(injectConstructorInfo);
    MetadataUtil.defineMetaData(PrototypeUtil.INJECT_CONSTRUCTOR_NAME_SET, objs, clazz);
  }

  static getInjectType(clazz: EggProtoImplClass): InjectType | undefined {
    const injectType: InjectType | undefined = MetadataUtil.getMetaData(PrototypeUtil.INJECT_TYPE, clazz);
    return injectType;
  }

  static getInjectObjects(clazz: EggProtoImplClass): Array<InjectObjectInfo | InjectConstructorInfo> {
    const injectType: InjectType | undefined = MetadataUtil.getMetaData(PrototypeUtil.INJECT_TYPE, clazz);
    if (!injectType) {
      return [];
    }
    if (injectType === InjectType.CONSTRUCTOR) {
      return MetadataUtil.getArrayMetaData<InjectConstructorInfo>(
        PrototypeUtil.INJECT_CONSTRUCTOR_NAME_SET,
        clazz
      ).sort((a, b) => {
        return a.refIndex - b.refIndex;
      });
    }
    return MetadataUtil.getArrayMetaData(PrototypeUtil.INJECT_OBJECT_NAME_SET, clazz);
  }

  // static getInjectConstructors(clazz: EggProtoImplClass): Array<InjectConstructorInfo> {
  //   return MetadataUtil.getArrayMetaData<InjectConstructorInfo>(PrototypeUtil.INJECT_CONSTRUCTOR_NAME_SET, clazz)
  //     .sort((a, b) => {
  //       return a.refIndex - b.refIndex;
  //     });
  // }

  // TODO fix proto type
  static getClazzProto(clazz: EggProtoImplClass): object | undefined {
    return MetadataUtil.getMetaData(PrototypeUtil.CLAZZ_PROTO, clazz);
  }

  // TODO fix proto type
  static setClazzProto(clazz: EggProtoImplClass, proto: object) {
    MetadataUtil.defineMetaData(PrototypeUtil.CLAZZ_PROTO, proto, clazz);
  }

  static getDesignType(clazz: EggProtoImplClass, propKey?: PropertyKey) {
    return MetadataUtil.getMetaData('design:type', clazz, propKey);
  }

  static getDesignParamtypes(clazz: EggProtoImplClass, propKey?: PropertyKey) {
    return MetadataUtil.getMetaData<unknown[]>('design:paramtypes', clazz, propKey);
  }
}
