export const Templates = {
  BASE_DAO: 'base_dao',
  DAO: 'dao',
  EXTENSION: 'extension',
} as const;
export type Templates = (typeof Templates)[keyof typeof Templates];
