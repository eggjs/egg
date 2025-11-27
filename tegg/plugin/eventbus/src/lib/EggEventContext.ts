import type { ContextCreator } from '@eggjs/eventbus-runtime';
import { IdenticalUtil } from '@eggjs/lifecycle';
import { EGG_CONTEXT, TEGG_CONTEXT } from '@eggjs/module-common';
import { AbstractEggContext, type EggContext as TEggContext } from '@eggjs/tegg-runtime';
import type { Context, Application } from 'egg';

type CreateContextFactory = (app: Application) => ContextCreator;

// AbstractEggContext use lots of static method
// In chair application mode plugin is in .sff
// Make different @eggjs/tegg-runtime exits
export function eggEventContextFactory(
  AbstractEggContextClazz: typeof AbstractEggContext,
  identicalUtil: typeof IdenticalUtil,
): CreateContextFactory {
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
      return (): TEggContext => {
        const eggCtx = app.createAnonymousContext();
        return new EggEventContext(eggCtx);
      };
    }
  }
  return EggEventContext.createContextFactory;
}
