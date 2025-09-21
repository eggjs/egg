import { EggLogger } from 'egg';
import { SingletonProto, AccessLevel, Inject } from '@eggjs/tegg';

@SingletonProto({
  // 如果需要在上层使用，需要把 accessLevel 显示声明为 public
  accessLevel: AccessLevel.PUBLIC,
})
export class HelloService {
  // 注入一个 logger
  @Inject()
  private logger: EggLogger;

  // 封装业务
  async hello(userId: string): Promise<string> {
    const result = { userId, handledBy: 'foo module' };
    this.logger.info('[hello] get result: %j', result);
    return `hello, ${result.userId}`;
  }
}
