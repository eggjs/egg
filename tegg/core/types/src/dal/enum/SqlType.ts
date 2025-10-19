export const SqlType = {
  BLOCK: 'BLOCK',
  INSERT: 'INSERT',
  SELECT: 'SELECT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const;
export type SqlType = (typeof SqlType)[keyof typeof SqlType];
