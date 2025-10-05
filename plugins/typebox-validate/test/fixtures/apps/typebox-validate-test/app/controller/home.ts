import { Controller } from 'egg';
import { type Static, Type } from '../../../../../../src/typebox.ts';
import { ValidateFactory, Validate } from '../../../../../../src/decorator.ts';

const TYPEBOX_ID = Type.Object({
  id: Type.String(),
});

const ValidateWithRedirect = ValidateFactory(ctx => {
  ctx.redirect('/422');
});

export const TYPEBOX_BODY = Type.Object({
  name: Type.String(),
  description: Type.Optional(Type.String({ transform: ['trim', 'toLowerCase'], minLength: 1, maxLength: 4 })),
  email: Type.String({ format: 'email' }),
  byte: Type.Optional(Type.Number({ format: 'byte' })),
  version: Type.Optional(Type.String({ format: 'semver' })),
  jsonString: Type.Optional(Type.String({ format: 'json-string' })),
});

export default class HomeController extends Controller {
  @Validate([[TYPEBOX_ID, ctx => ctx.params]])
  public async create() {
    const { ctx } = this;
    const res1 = ctx.tValidate(TYPEBOX_BODY, ctx.request.body);
    const res2 = ctx.tValidateWithoutThrow(TYPEBOX_BODY, ctx.request.body);
    const p: Static<typeof TYPEBOX_BODY> = ctx.request.body;
    ctx.body = {
      n: p.name,
      d: p.description,
      e: p.email,
      same: res1 === res2,
    };
  }

  public async update() {
    const { ctx } = this;
    const valid = ctx.tValidateWithoutThrow(TYPEBOX_BODY, ctx.request.body);
    if (valid) {
      ctx.body = {
        message: 'ok',
      };
    } else {
      ctx.status = 422;
      ctx.body = {
        // @ts-ignore
        errors: this.app.ajv.errors,
      };
    }
  }

  @Validate([
    [TYPEBOX_ID, ctx => ctx.params],
    [
      TYPEBOX_BODY,
      ctx => ctx.request.body,
      (_ctx, errors) => 'kaiwei custom error: ' + errors.map(e => e.message).join(':'),
    ],
  ])
  public async delete() {
    const { ctx } = this;
    const p: Static<typeof TYPEBOX_BODY> = ctx.request.body;
    const res = await ctx.service.home.index({
      version: p.version,
    });
    ctx.body = {
      version: res,
    };
  }

  @ValidateWithRedirect([
    [TYPEBOX_ID, ctx => ctx.params],
    [TYPEBOX_BODY, ctx => ctx.request.body],
  ])
  public async put(): Promise<void> {
    const { ctx } = this;
    const p: Static<typeof TYPEBOX_BODY> = ctx.request.body;
    const res = await ctx.service.home.index({
      version: p.version,
    });
    ctx.body = {
      version: res,
    };
  }
}
