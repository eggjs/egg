import { ContextProto, Inject } from '@eggjs/tegg';
import { type MainRunner, Runner } from '@eggjs/tegg/standalone';

@ContextProto()
@Runner()
export class FooRunner implements MainRunner<string> {
  @Inject()
  dynamicBar: any;

  async main(): Promise<string> {
    return this.dynamicBar.getName();
  }
}
