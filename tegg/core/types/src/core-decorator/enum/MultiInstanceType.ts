export const MultiInstanceType = {
  STATIC: 'STATIC',
  DYNAMIC: 'DYNAMIC',
} as const;
export type MultiInstanceType = (typeof MultiInstanceType)[keyof typeof MultiInstanceType];
