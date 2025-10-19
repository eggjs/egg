export const InjectType = {
  PROPERTY: 'PROPERTY',
  CONSTRUCTOR: 'CONSTRUCTOR',
} as const;
export type InjectType = (typeof InjectType)[keyof typeof InjectType];
