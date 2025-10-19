import type { AccessLevel, ObjectInitTypeLike } from './enum/index.ts';
import type { MultiInstancePrototypeGetObjectsContext, ObjectInfo } from './model/index.ts';

export interface BaseMultiInstancePrototypeCallbackParams {
  /**
   * obj init type
   */
  initType?: ObjectInitTypeLike;
  /**
   * access level
   */
  accessLevel?: AccessLevel;
  /**
   * EggPrototype implement type
   */
  protoImplType?: string;
}

export interface MultiInstancePrototypeCallbackParams extends BaseMultiInstancePrototypeCallbackParams {
  getObjects(ctx: MultiInstancePrototypeGetObjectsContext): ObjectInfo[] | Promise<ObjectInfo[]>;
}

export interface MultiInstancePrototypeStaticParams extends BaseMultiInstancePrototypeCallbackParams {
  /**
   * object info list
   */
  objects: ObjectInfo[];
}

export type MultiInstancePrototypeParams = MultiInstancePrototypeCallbackParams | MultiInstancePrototypeStaticParams;
