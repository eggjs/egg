export const ErrorCodes = {
  EGG_PROTO_NOT_FOUND: 'EGG_PROTO_NOT_FOUND',
  MULTI_PROTO_FOUND: 'MULTI_PROTO_FOUND',
  INCOMPATIBLE_PROTO_INJECT: 'INCOMPATIBLE_PROTO_INJECT',
} as const;
export type ErrorCodes = (typeof ErrorCodes)[keyof typeof ErrorCodes];
