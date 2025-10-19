import { SingletonProto, AccessLevel } from '@eggjs/tegg';
import { BaseFooDAO } from './base/BaseFooDAO.js';
import { Foo } from '../../Foo.js';

/**
 * FooDAO 类
 * @class FooDAO
 * @classdesc 在此扩展关于 Foo 数据的一切操作
 * @augments BaseFooDAO
 */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export default class FooDAO extends BaseFooDAO {
  async findByName(name: string): Promise<Foo[]> {
    return this.dataSource.execute('findByName', {
      name,
    });
  }
}
