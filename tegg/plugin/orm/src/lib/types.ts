import type { AbstractDriver, connect } from 'leoric';

export type DataType = AbstractDriver['DataType'];
export type RealmType = Awaited<ReturnType<typeof connect>>;
