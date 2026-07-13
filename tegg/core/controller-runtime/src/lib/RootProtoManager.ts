import { InnerObjectProto } from '@eggjs/core-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { MapUtil } from '@eggjs/tegg-common-util';
import { AccessLevel } from '@eggjs/tegg-types';

/**
 * The structural request shape RootProtoManager needs. Both the egg Context
 * and fetch-style contexts satisfy it.
 */
export interface RootProtoRequestContext {
  method: string;
  host: string;
  path: string;
}

export type GetRootProtoCallback = (ctx: RootProtoRequestContext) => EggPrototype | undefined;

// PUBLIC: the egg host resolves it by name to expose `app.rootProtoManager` for
// the teggRootProto middleware, and the fetch host's FetchEventHandler injects it.
@InnerObjectProto({ accessLevel: AccessLevel.PUBLIC })
export class RootProtoManager {
  // <method, GetRootProtoCallback[]>
  protoMap: Map<string, GetRootProtoCallback[]> = new Map();

  registerRootProto(method: string, cb: GetRootProtoCallback, host: string): void {
    host = host || '';
    const cbList = MapUtil.getOrStore(this.protoMap, method + host, []);
    cbList.push(cb);
  }

  getRootProto(ctx: RootProtoRequestContext): EggPrototype | undefined {
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
