import { Context, Application } from 'egg';
import { AbstractEggContext, type EggContext } from '@eggjs/tegg-runtime';
import { IdenticalUtil } from '@eggjs/tegg';
import { EGG_CONTEXT, TEGG_CONTEXT } from '@eggjs/egg-module-common';
import { type ContextCreator } from '@eggjs/tegg-eventbus-runtime';

// AbstractEggContext use lots of static method
// In chair application mode plugin is in .sff
// Make different @eggjs/tegg-runtime exits
export function eggEventContextFactory(
  AbstractEggContextClazz: typeof AbstractEggContext,
  identicalUtil: typeof IdenticalUtil
) {
  class EggEventContext extends AbstractEggContextClazz {
    readonly id: string;

    constructor(context: Context) {
      super();
      this.set(EGG_CONTEXT, context);
      context[TEGG_CONTEXT] = this;
      // In chair application mode,
      // Plugin event may install in app dir,
      // Plugin tegg may install in layer dir,
      // Will has multi IdenticalUtil instance.
      this.id = identicalUtil.createContextId((context.tracer as { traceId: string } | undefined)?.traceId);
    }

    static createContextFactory(app: Application): ContextCreator {
      return (): EggContext => {
        const eggCtx = app.createAnonymousContext();
        return new EggEventContext(eggCtx);
      };
    }
  }
  return EggEventContext.createContextFactory;
}
