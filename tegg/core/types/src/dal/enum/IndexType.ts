export const IndexType = {
  PRIMARY: 'PRIMARY',
  UNIQUE: 'UNIQUE',
  INDEX: 'INDEX',
  FULLTEXT: 'FULLTEXT',
  SPATIAL: 'SPATIAL',
} as const;
export type IndexType = (typeof IndexType)[keyof typeof IndexType];
