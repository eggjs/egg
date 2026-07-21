import type { AdviceContext, ControllerAdviceContext, IAdvice } from '@eggjs/tegg-types';

/** Base class for dependency-injected controller middleware. */
export abstract class AbstractControllerAdvice<TContext = unknown> implements IAdvice {
  async around(adviceContext: AdviceContext, next: () => Promise<any>): Promise<any> {
    const { controllerContext } = adviceContext as ControllerAdviceContext<TContext>;
    return this.middleware(controllerContext, next, adviceContext);
  }

  abstract middleware(ctx: TContext, next: () => Promise<any>, adviceContext: AdviceContext): Promise<any>;
}
