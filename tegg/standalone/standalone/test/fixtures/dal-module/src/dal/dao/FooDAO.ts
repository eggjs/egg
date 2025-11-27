import { SingletonProto, AccessLevel } from '@eggjs/tegg';

import { Foo } from '../../Foo.js';
import { BaseFooDAO } from './base/BaseFooDAO.js';

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
