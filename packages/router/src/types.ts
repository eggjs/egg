export type Next = () => Promise<void>;
export type MiddlewareFunc = (ctx: any, next: Next) => Promise<void> | void;
export type MiddlewareFuncWithParamProperty = MiddlewareFunc & { param?: string };
export type ParamMiddlewareFunc = (param: string, ctx: any, next: Next) => Promise<void> | void;
export type MiddlewareFuncWithRouter<T> = MiddlewareFunc & { router: T };

export interface ResourcesController {
  index?: MiddlewareFunc;
  new?: MiddlewareFunc;
  create?: MiddlewareFunc;
  show?: MiddlewareFunc;
  edit?: MiddlewareFunc;
  update?: MiddlewareFunc;
  destroy?: MiddlewareFunc;
}
