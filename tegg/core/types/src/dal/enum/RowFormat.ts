export const RowFormat = {
  DEFAULT: 'DEFAULT',
  DYNAMIC: 'DYNAMIC',
  FIXED: 'FIXED',
  COMPRESSED: 'COMPRESSED',
  REDUNDANT: 'REDUNDANT',
  COMPACT: 'COMPACT',
} as const;
export type RowFormat = (typeof RowFormat)[keyof typeof RowFormat];
