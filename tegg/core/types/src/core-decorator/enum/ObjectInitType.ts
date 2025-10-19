export const ObjectInitType = {
  // new object every time
  ALWAYS_NEW: 'ALWAYS_NEW',
  // new object only once in one request
  CONTEXT: 'CONTEXT',
  // new object only once
  SINGLETON: 'SINGLETON',
} as const;
export type ObjectInitType = (typeof ObjectInitType)[keyof typeof ObjectInitType];

export type ObjectInitTypeLike = ObjectInitType | string;

export const INIT_TYPE_TRY_ORDER: readonly ObjectInitType[] = [
  ObjectInitType.CONTEXT,
  ObjectInitType.SINGLETON,
  ObjectInitType.ALWAYS_NEW,
] as const;
