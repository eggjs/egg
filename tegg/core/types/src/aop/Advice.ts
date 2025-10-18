export interface AdviceContext<T = object, K = any> {
  that: T;
  method: PropertyKey;
  args: any[];
  adviceParams?: K;
  get(key: PropertyKey): any | undefined;
  set(set: PropertyKey, value: any): this;
}

/**
 * execute order:
 * 1. beforeCall
 * 1. around
 * 1. afterReturn/afterThrow
 * 1. afterFinally
 */
export interface IAdvice<T = object, K = any> {
  /**
   * call before function
   * @param ctx
   */
  beforeCall?(ctx: AdviceContext<T, K>): Promise<void>;

  /**
   * call after function succeed
   */
  afterReturn?(ctx: AdviceContext<T, K>, result: any): Promise<void>;

  /**
   * call after function throw error
   */
  afterThrow?(ctx: AdviceContext<T, K>, error: Error): Promise<void>;

  /**
   * always call after function done
   */
  afterFinally?(ctx: AdviceContext<T, K>): Promise<void>;

  /**
   * execute the function
   * the only one can modify the function return value
   */
  around?(ctx: AdviceContext<T, K>, next: () => Promise<any>): Promise<any>;
}
