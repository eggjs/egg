import { Router } from "./Router.ts";

export type * from "./types.ts";
export * from "./Layer.ts";
export * from "./Router.ts";
export * from "./EggRouter.ts";

export const KoaRouter: typeof Router = Router;
export default Router;
