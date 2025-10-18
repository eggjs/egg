export enum PropagationType {
  /** 不管是当前调用栈是否存在事务，始终让当前函数在新的事务中执行 */
  ALWAYS_NEW = 'ALWAYS_NEW',
  /** 如果当前调用栈存在事务则复用，否则创建一个 */
  REQUIRED = 'REQUIRED',
}

export interface TransactionalParams {
  /** 事务传播方式，默认 REQUIRED */
  propagation?: PropagationType;
  /**
   * 数据源，默认使用 module 的数据源，非 module 时将使用 default 数据源
   * 需要注意的是数据源之间的连接是隔离的，回滚也是独立的
   * 比如函数 B 在函数 A 中执行，A 执行异常时，不会回滚 B 中执行的 sql
   * */
  datasourceName?: string;
}

export interface TransactionMetadata {
  propagation: PropagationType;
  method: PropertyKey;
  datasourceName?: string;
}

export const TRANSACTION_META_DATA = Symbol.for('EggPrototype#transaction#metaData');
export const IS_TRANSACTION_CLAZZ = Symbol.for('EggPrototype#IS_TRANSACTION_CLAZZ');
