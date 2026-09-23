import type { AttributeMeta, connect } from 'leoric';

export type DataType = InstanceType<AttributeMeta['type']>;
export type RealmType = Awaited<ReturnType<typeof connect>>;
