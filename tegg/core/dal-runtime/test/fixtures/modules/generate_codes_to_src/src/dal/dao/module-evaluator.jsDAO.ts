import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import { BaseFooDAO } from './base/BaseFooDAO';

/**
 * FooDAO 类
 * @class FooDAO
 * @classdesc 在此扩展关于 Foo 数据的一切操作
 * @extends BaseFooDAO
 */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class FooDAO extends BaseFooDAO {}
