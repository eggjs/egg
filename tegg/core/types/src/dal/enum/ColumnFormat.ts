export const ColumnFormat = {
  FIXED: 'FIXED',
  DYNAMIC: 'DYNAMIC',
  DEFAULT: 'DEFAULT',
} as const;
export type ColumnFormat = (typeof ColumnFormat)[keyof typeof ColumnFormat];
