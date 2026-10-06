import { AbstractControllerAdvice, Inject, SingletonProto, type EggContext } from '@eggjs/tegg';
import { AccessLevel } from '@eggjs/tegg-types';
import { Advice } from '@eggjs/tegg/aop';

@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class ControllerAdviceDependency {
  readonly value = 'injected';
}

@Advice({ accessLevel: AccessLevel.PUBLIC })
export class WrapControllerAdvice extends AbstractControllerAdvice<EggContext> {
  @Inject()
  private readonly dependency: ControllerAdviceDependency;

  async middleware(ctx: EggContext, next: () => Promise<void>): Promise<void> {
    await next();
    ctx.body = { wrapped: ctx.body, dependency: this.dependency.value };
  }
}
