export enum ObjectInitType {
  // new object every time
  ALWAYS_NEW = 'ALWAYS_NEW',
  // new object only once in one request
  CONTEXT = 'CONTEXT',
  // new object only once
  SINGLETON = 'SINGLETON',
}

export type ObjectInitTypeLike = ObjectInitType | string;

export const INIT_TYPE_TRY_ORDER = [ObjectInitType.CONTEXT, ObjectInitType.SINGLETON, ObjectInitType.ALWAYS_NEW];
