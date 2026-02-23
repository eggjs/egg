import type { AsyncLocalStorage } from 'node:async_hooks';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import util from 'node:util';

import { FrameworkBaseError, FrameworkErrorFormatter } from '@eggjs/errors';
import chalk from 'chalk';
import circularJSON from 'circular-json-for-egg';
import iconv from 'iconv-lite';
import { logDate } from 'utility';

import { levels, type LoggerLevel } from './level.ts';

const hostname = os.hostname();
const durationRegexp = /([0-9]+ms)/g;
const categoryRegexp = /(\[[\w\-_.:]+\])/g; // oxlint-disable-line no-useless-escape
const httpMethodRegexp = /(GET|POST|PUT|PATCH|HEAD|DELETE) /g;

export interface LoggerMeta {
  level?: string;
  date?: string;
  pid?: number;
  hostname?: string;
  message?: string;
  paddingMessage?: string;
  ctx?: unknown;
  raw?: boolean;
  formatter?: (meta: LoggerMeta) => string;
  [key: string]: unknown;
}

export interface TransportOptions {
  level?: LoggerLevel | number;
  formatter?: ((meta: LoggerMeta) => string) | null;
  contextFormatter?: ((meta: LoggerMeta) => string) | null;
  paddingMessageFormatter?: ((ctx: unknown) => string) | null;
  json?: boolean;
  dateISOFormat?: boolean;
  encoding?: string;
  eol?: string;
  localStorage?: AsyncLocalStorage<unknown>;
  maxCauseChainLength?: number;
}

export interface FileTransportOptions extends TransportOptions {
  file?: string | null;
  flushInterval?: number;
  maxBufferLength?: number;
}

export interface ConsoleTransportOptions extends TransportOptions {
  stderrLevel?: LoggerLevel | number;
}

export interface EggLoggerOptions extends Omit<TransportOptions, 'level'> {
  level?: LoggerLevel;
  consoleLevel?: LoggerLevel;
  file?: string | null;
  dir?: string;
  buffer?: boolean;
  outputJSON?: boolean;
  outputJSONOnly?: boolean;
  jsonFile?: string;
  concentrateError?: 'duplicate' | 'redirect' | 'ignore';
  concentrateErrorLoggerName?: string;
  flushInterval?: number;
  [key: string]: unknown;
}

export interface EggLoggersOptions extends EggLoggerOptions {
  type: string;
  env?: string;
  appLogName: string;
  coreLogName: string;
  agentLogName: string;
  errorLogName: string;
  coreLogger?: Partial<EggLoggersOptions>;
}

export interface EggConsoleLoggerOptions extends TransportOptions {
  env?: string;
}

export interface EggLoggersConfig {
  logger: EggLoggersOptions;
  customLogger?: Record<string, EggLoggerOptions>;
}

export function normalizeLevel(level?: LoggerLevel | number | string): number | undefined {
  if (typeof level === 'number') return level;
  if (typeof level === 'string' && level) {
    return levels[level.toUpperCase()];
  }
  return undefined;
}

export function defaultContextPaddingMessage(ctx: Record<string, unknown>): string {
  const userId = ctx.userId || '-';
  const tracer = ctx.tracer as Record<string, unknown> | undefined;
  const traceId = tracer?.traceId || '-';
  let use = 0;
  if (ctx.performanceStarttime) {
    use = Math.floor((performance.now() - (ctx.performanceStarttime as number)) * 1000) / 1000;
  } else if (ctx.starttime) {
    use = Date.now() - (ctx.starttime as number);
  }
  return '[' + userId + '/' + (ctx.ip as string) + '/' + traceId + '/' + use + 'ms ' + ctx.method + ' ' + ctx.url + ']';
}

export function defaultFormatter(meta: LoggerMeta): string {
  let paddingMessage = ' ';
  if (meta.paddingMessage) {
    paddingMessage = ` ${meta.paddingMessage} `;
  } else {
    const ctx = meta.ctx;
    if (ctx) {
      paddingMessage = ` ${defaultContextPaddingMessage(ctx as Record<string, unknown>)} `;
    }
  }
  return meta.date + ' ' + meta.level + ' ' + meta.pid + paddingMessage + meta.message;
}

export function consoleFormatter(meta: LoggerMeta): string {
  let paddingMessage = ' ';
  if (meta.paddingMessage) {
    paddingMessage = ` ${meta.paddingMessage} `;
  }
  let msg = meta.date + ' ' + meta.level + ' ' + meta.pid + paddingMessage + meta.message;
  if (chalk.level === 0) return msg;

  if (meta.level === 'ERROR') return chalk.red(msg);
  if (meta.level === 'WARN') return chalk.yellow(msg);

  msg = msg.replace(durationRegexp, chalk.green('$1'));
  msg = msg.replace(categoryRegexp, chalk.blue('$1'));
  msg = msg.replace(httpMethodRegexp, chalk.cyan('$1 '));
  return msg;
}

export function formatLog(
  level: string,
  args: unknown[],
  meta: LoggerMeta | undefined,
  options: TransportOptions,
): string | Buffer {
  meta = meta ?? {};
  let message: string;
  let output: string;
  let formatter = meta.formatter ?? options.formatter;

  if (meta.ctx) {
    if (options.contextFormatter) {
      formatter = options.contextFormatter;
      if (!meta.paddingMessage) {
        meta.paddingMessage = options.paddingMessageFormatter
          ? options.paddingMessageFormatter(meta.ctx)
          : defaultContextPaddingMessage(meta.ctx as Record<string, unknown>);
      }
    } else if (options.paddingMessageFormatter && !meta.paddingMessage) {
      meta.paddingMessage = options.paddingMessageFormatter(meta.ctx);
    }
  }

  if (args[0] instanceof Error) {
    message = formatError(args[0], options);
  } else {
    message = util.format(...args);
  }

  if (meta.raw === true) {
    output = message;
  } else if (options.json === true || formatter) {
    meta.level = level;
    meta.date = options.dateISOFormat ? new Date().toISOString() : logDate(',');
    meta.pid = process.pid;
    meta.hostname = hostname;
    meta.message = message;
    if (options.json === true) {
      const outputMeta = { ...meta, ctx: undefined };
      output = JSON.stringify(outputMeta);
    } else {
      output = (formatter as (m: LoggerMeta) => string)(meta);
    }
  } else {
    output = message;
  }

  if (!output) return Buffer.from('');

  output += options.eol;

  return options.encoding === 'utf8' ? output : iconv.encode(output, options.encoding!);
}

// Like Object.assign, but don't copy undefined values
export function assign<T>(target: Partial<T>, ...sources: Array<Partial<T> | null | undefined>): T {
  const t = target as Record<string, unknown>;
  for (const source of sources) {
    if (source == null) continue;
    const s = source as Record<string, unknown>;
    for (const key of Object.keys(s)) {
      const val = s[key];
      if (val !== undefined) {
        t[key] = val;
      }
    }
  }
  return target as T;
}

export function formatError(err: Error, options?: TransportOptions, causeLength?: number): string {
  if (FrameworkBaseError.isFrameworkError(err)) {
    return FrameworkErrorFormatter.format(err);
  }
  const msg = errorToString(err, options, causeLength);
  return util.format('%s\npid: %s\nhostname: %s\n', msg, process.pid, hostname);
}

function errorToString(err: Error, options?: TransportOptions, causeLength = 0): string {
  const maxCauseChainLength = options?.maxCauseChainLength ?? 10;

  if (causeLength > maxCauseChainLength) return 'too long cause chain';

  const e = err as Error & {
    code?: string;
    host?: string;
    errors?: Error[];
    cause?: Error;
  };

  let errName = e.name || 'no_name';
  if (e.name === 'Error' && typeof e.code === 'string') {
    errName = e.code + errName;
  }

  let errMessage = e.message || 'no_message';
  if (e.host) errMessage += ` (${e.host})`;

  const errStack = e.stack || 'no_stack';
  const errProperties = Object.keys(e)
    .map((key) => inspectProp(key, (e as unknown as Record<string, unknown>)[key]))
    .join('\n');

  let errorString = util.format(
    'nodejs.%s: %s\n%s\n%s',
    errName,
    errMessage,
    errStack.substring(errStack.indexOf('\n') + 1),
    errProperties,
  );

  if (e.name === 'AggregateError' && e.errors) {
    for (let i = 0; i < e.errors.length; i++) {
      const subErrorMsg = errorToString(e.errors[i], options, causeLength + 1);
      errorString = util.format('%s\n[error-%d]:\n\n%s', errorString, i, subErrorMsg);
    }
  }

  if (e.cause) {
    const causeMsg = errorToString(e.cause, options, causeLength + 1);
    errorString = util.format('%s\ncause:\n\n%s', errorString, causeMsg);
  }

  return errorString;
}

function inspectProp(key: string, value: unknown): string {
  return `${key}: ${formatObject(value)}`;
}

function formatString(str: string): string {
  if (str.length > 10000) return `${str.substring(0, 10000)}...(${str.length})`;
  return str;
}

function formatBuffer(buf: { type: string; data: number[] }): string {
  const tail = buf.data.length > 50 ? ` ...(${buf.data.length}) ` : '';
  const bufStr = buf.data
    .slice(0, 50)
    .map((i) => {
      const hex = i.toString(16);
      return hex.length === 1 ? `0${hex}` : hex;
    })
    .join(' ');
  return `<Buffer ${bufStr}${tail}>`;
}

function formatObject(obj: unknown): string {
  try {
    return circularJSON.stringify(obj, (_key: string, v: unknown) => {
      if (typeof v === 'string') return formatString(v);
      if (v && (v as Record<string, unknown>).type === 'Buffer' && Array.isArray((v as Record<string, unknown>).data)) {
        return formatBuffer(v as { type: string; data: number[] });
      }
      if (v instanceof RegExp) return util.inspect(v);
      return v;
    });
  } catch {
    return String(obj);
  }
}
