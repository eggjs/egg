import { ContextProto, Inject } from '@eggjs/tegg';

import { Pkg } from './model/Pkg.ts';

@ContextProto()
export class CtxService {
  @Inject()
  Pkg: typeof Pkg;

  async createCtxPkg(data: { name: string; desc: string }): Promise<Pkg> {
    const bone = await this.Pkg.create(data as any);
    return bone as Pkg;
  }

  async findCtxPkg(name: string): Promise<Pkg | null> {
    const app = await this.Pkg.findOne({ name });
    return app as Pkg;
  }
}
