export const AccessLevel = {
  // only access from self load unit
  PRIVATE: 'PRIVATE',
  // can access from parent load unit
  PUBLIC: 'PUBLIC',
} as const;
export type AccessLevel = (typeof AccessLevel)[keyof typeof AccessLevel];
