export interface CacheValue {
  from: string;
  val: string | undefined;
}

export interface ICache {
  get(key: string): CacheValue;
  set(key: string, val: string): void;
}
