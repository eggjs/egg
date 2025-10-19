export const EggType = {
  APP: 'APP',
  CONTEXT: 'CONTEXT',
} as const;
export type EggType = (typeof EggType)[keyof typeof EggType];
