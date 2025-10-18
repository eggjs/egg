import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import { BaseMultiPrimaryKeyDAO } from './base/BaseMultiPrimaryKeyDAO';

/**
 * MultiPrimaryKeyDAO 类
 * @class MultiPrimaryKeyDAO
 * @classdesc 在此扩展关于 MultiPrimaryKey 数据的一切操作
 * @extends BaseMultiPrimaryKeyDAO
 */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class MultiPrimaryKeyDAO extends BaseMultiPrimaryKeyDAO {}
