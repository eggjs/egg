import { AbstractEggContext } from '@eggjs/tegg-runtime';
import { IdenticalUtil } from '@eggjs/tegg';

export class StandaloneContextImpl extends AbstractEggContext {
  readonly id: string;

  constructor() {
    super();
    this.id = IdenticalUtil.createContextId();
  }
}
