import { Service } from '../index';

class FooService extends Service {
  constructor(ctx) {
    super(ctx);
  }

  async foo() {
    this.app.config.HOME;
    this.app.logger.info('foo');
  }
}