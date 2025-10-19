export const InsertMethod = {
  NO: 'NO',
  FIRST: 'FIRST',
  LAST: 'LAST',
} as const;
export type InsertMethod = (typeof InsertMethod)[keyof typeof InsertMethod];
