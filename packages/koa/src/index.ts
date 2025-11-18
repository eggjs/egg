import { Application } from './application.ts';

export default Application;

export * from './application.ts';
export {
  KoaContext,
  /**
   * @deprecated Use `KoaContext` instead, keep compatibility with koa
   */
  KoaContext as Context,
} from './context.ts';
export {
  KoaRequest,
  /**
   * @deprecated Use `KoaRequest` instead, keep compatibility with koa
   */
  KoaRequest as Request,
} from './request.ts';
export {
  KoaResponse,
  /**
   * @deprecated Use `KoaResponse` instead, keep compatibility with koa
   */
  KoaResponse as Response,
} from './response.ts';
export type { CustomError, AnyProto } from './types.ts';
