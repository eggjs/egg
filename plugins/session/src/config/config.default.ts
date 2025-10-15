import z from "zod";
import { SessionOptions } from "koa-session";

export const SessionConfig = SessionOptions.extend({
  logValue: z.boolean().default(true),
}) satisfies z.ZodType as z.ZodType<
  typeof SessionOptions._type & { logValue: boolean }
>;

export type SessionConfig = z.infer<typeof SessionConfig>;

const config: { session: SessionConfig } = {
  session: SessionConfig.parse({
    maxAge: 24 * 3600 * 1000, // ms, one day
    key: "EGG_SESS",
    httpOnly: true,
    encrypt: true,
  }),
};

export default config;
