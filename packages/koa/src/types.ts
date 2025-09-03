export type CustomError = Error & {
  headers?: Record<string, string>;
  status?: number;
  statusCode?: number;
  code?: string;
  expose?: boolean;
  headerSent?: boolean;
};

export interface AnyProto {
  // oxlint-disable-next-line typescript/no-explicit-any
  [key: string | symbol]: any;
}
