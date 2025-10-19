export const CompressionType = {
  ZLIB: 'ZLIB',
  LZ4: 'LZ4',
  NONE: 'NONE',
} as const;
export type CompressionType = (typeof CompressionType)[keyof typeof CompressionType];
