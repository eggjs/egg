export const IndexStoreType = {
  BTREE: 'BTREE',
  HASH: 'HASH',
} as const;
export type IndexStoreType = (typeof IndexStoreType)[keyof typeof IndexStoreType];
