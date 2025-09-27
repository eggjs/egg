import z from 'zod';
import { SessionOptions } from 'koa-session';

export const SessionConfig = SessionOptions.extend({
  logValue: z.boolean().default(true),
});

export type SessionConfig = z.infer<typeof SessionConfig>;

export default {
  session: SessionConfig.parse({
    maxAge: 24 * 3600 * 1000, // ms, one day
    key: 'EGG_SESS',
    httpOnly: true,
    encrypt: true,
  }),
};
