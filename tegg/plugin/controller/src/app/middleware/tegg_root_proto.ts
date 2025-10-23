import type { MiddlewareFunc } from 'egg';
import { ROOT_PROTO } from '@eggjs/module-common';

export default (): MiddlewareFunc => {
  return async function teggRootProto(ctx, next) {
    ctx[ROOT_PROTO] = ctx.app.rootProtoManager.getRootProto(ctx);
    return next();
  };
};
