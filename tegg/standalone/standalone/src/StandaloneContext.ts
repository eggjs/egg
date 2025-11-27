import { IdenticalUtil } from '@eggjs/lifecycle';
import { AbstractEggContext } from '@eggjs/tegg-runtime';

export class StandaloneContext extends AbstractEggContext {
  id: string;

  constructor() {
    super();
    this.id = IdenticalUtil.createContextId();
  }
}
