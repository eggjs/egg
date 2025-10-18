import { type EggPrototype } from '@eggjs/tegg-metadata';
import { type EggContext } from '@eggjs/tegg';
import { MapUtil } from '@eggjs/tegg-common-util';

export type GetRootProtoCallback = (ctx: EggContext) => EggPrototype | undefined;

export class RootProtoManager {
  // <method, GetRootProtoCallback[]>
  protoMap: Map<string, GetRootProtoCallback[]> = new Map();

  registerRootProto(method: string, cb: GetRootProtoCallback, host: string) {
    host = host || '';
    const cbList = MapUtil.getOrStore(this.protoMap, method + host, []);
    cbList.push(cb);
  }

  getRootProto(ctx: EggContext): EggPrototype | undefined {
    const hostCbList = this.protoMap.get(ctx.method + ctx.host);
    if (hostCbList) {
      for (const cb of hostCbList) {
        const proto = cb(ctx);
        if (proto) {
          return proto;
        }
      }
    }

    const cbList = this.protoMap.get(ctx.method);
    if (!cbList) {
      return;
    }
    for (const cb of cbList) {
      const proto = cb(ctx);
      if (proto) {
        return proto;
      }
    }
  }
}
