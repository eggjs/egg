import type { ErrorObject } from 'ajv/dist/2019.js';
import type { Context } from 'egg';

import type { TSchema } from './typebox.ts';

type CustomErrorMessage = (ctx: Context, errors: ErrorObject[]) => string;
type GetData = (ctx: Context, args: unknown[]) => unknown;
export type ValidateRule = [TSchema, GetData, CustomErrorMessage?];

export type ValidateDecorator = (rules: ValidateRule[]) => MethodDecorator;

/**
 * Validate decorator factory
 */
export function ValidateFactory(
  customHandler: (ctx: Context, data?: unknown, schema?: TSchema, customError?: CustomErrorMessage) => void,
): ValidateDecorator {
  return function Validate(rules: ValidateRule[]): MethodDecorator {
    return (_, __, descriptor: PropertyDescriptor): PropertyDescriptor => {
      const fn = descriptor.value;
      descriptor.value = async function (...args: unknown[]) {
        const { ctx } = this as { ctx: Context };
        for (const rule of rules) {
          const [schema, getData, customError] = rule;
          const data = getData(ctx, args);
          const valid = ctx.tValidateWithoutThrow(schema, data);
          if (!valid && customHandler) {
            return customHandler(ctx, data, schema, customError);
          }
        }
        return await fn.apply(this, args);
      };
      return descriptor;
    };
  };
}

/**
 * Validate decorator
 *
 * @example
 * ```ts
 * @Validate([[paramsSchema, ctx => ctx.params]])
 * async index() {
 *   const { ctx } = this;
 *   ctx.body = ctx.params;
 * }
 * ```
 */
export const Validate: ValidateDecorator = ValidateFactory((ctx, data, schema, customError) => {
  const app = ctx.app;
  const message = customError ? customError(ctx, app.ajv.errors!) : 'Validation Failed';
  ctx.throw(422, message, {
    code: 'invalid_param',
    errorData: data,
    currentSchema: JSON.stringify(schema),
    errors: app.ajv.errors,
  });
});
