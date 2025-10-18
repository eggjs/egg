import type { EggContext, Next } from '@eggjs/tegg-types';
import { Middleware } from '../../src/index.js';

async function middleware1(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

async function middleware2(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

async function middleware3(ctx: EggContext, next: Next) {
  console.log(ctx, next);
}

@Middleware(middleware1)
export class MiddlewareController {
  @Middleware(middleware2)
  @Middleware(middleware3)
  async hello(): Promise<void> {
    return;
  }
}

@Middleware(middleware1)
export class MiddlewaresController {
  @Middleware(middleware2, middleware3)
  async hello(): Promise<void> {
    return;
  }
}
