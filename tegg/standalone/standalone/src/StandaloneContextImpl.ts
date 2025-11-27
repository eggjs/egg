import { IdenticalUtil } from '@eggjs/tegg';
import { AbstractEggContext } from '@eggjs/tegg-runtime';

export class StandaloneContextImpl extends AbstractEggContext {
  readonly id: string;

  constructor() {
    super();
    this.id = IdenticalUtil.createContextId();
  }
}
