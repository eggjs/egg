import { expectType } from 'tsd';
import { Tracer } from '../src/index.js';
import { Context, Application, Agent } from 'egg';

const ctx = {} as Context;
const app = {} as Application;
const agent = {} as Agent;

expectType<string>(ctx.traceId);
expectType<string>(ctx.tracer.traceId);
expectType<Tracer>(ctx.tracer);

expectType<string>(app.tracer.traceId);
expectType<string>(agent.tracer.traceId);
expectType<Tracer>(app.tracer);
expectType<Tracer>(agent.tracer);
