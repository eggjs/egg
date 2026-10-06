import { Inject, SingletonProto, type Logger } from '@eggjs/tegg';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

@Runner()
@SingletonProto()
export class Foo implements MainRunner<Logger> {
  @Inject()
  logger: Logger;

  async main(): Promise<Logger> {
    return this.logger;
  }
}
