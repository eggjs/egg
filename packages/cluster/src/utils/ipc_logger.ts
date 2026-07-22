import net from 'node:net';

import { getLogger } from 'onelogger';

import type { MessageBody } from './messenger.ts';

/**
 * onelogger instance for Node.js cluster module IPC traffic between master and app workers.
 * Users can override the underlying sink via `onelogger.setLogger()` / `setCustomLogger()`.
 */
export const ipcLogger = getLogger('egg/cluster/ipc');

/**
 * Whether internal-level cluster IPC logs (NODE_CLUSTER newconn/accepted/listening/...) are enabled.
 * These are very verbose (one `cluster:newconn` per HTTP request), so they are opt-in
 * via the `EGG_CLUSTER_IPC_LOG` environment variable (any truthy value enables).
 */
export const internalIpcLogEnabled = !!process.env.EGG_CLUSTER_IPC_LOG;

const MAX_STRING_LEN = 200;
const MAX_TOTAL_LEN = 1024;

function describeHandle(handle: unknown): string {
  if (handle == null) return '';
  if (handle instanceof net.Socket) {
    const fd = (handle as unknown as { _handle?: { fd?: number } })._handle?.fd;
    return fd != null ? `<Socket fd=${fd}>` : '<Socket>';
  }
  if (handle instanceof net.Server) {
    return '<Server>';
  }
  const ctor = (handle as { constructor?: { name?: string } })?.constructor?.name;
  return ctor ? `<${ctor}>` : '<handle>';
}

function makeReplacer() {
  const seen = new WeakSet<object>();
  return function replacer(_key: string, value: unknown) {
    if (value && typeof value === 'object') {
      if (seen.has(value as object)) return '<Circular>';
      seen.add(value as object);
      if (value instanceof net.Socket) return describeHandle(value);
      if (value instanceof net.Server) return '<Server>';
      if (Buffer.isBuffer(value)) return `<Buffer len=${value.length}>`;
    }
    if (typeof value === 'string' && value.length > MAX_STRING_LEN) {
      return `${value.slice(0, MAX_STRING_LEN)}...(truncated)`;
    }
    return value;
  };
}

function stringifyData(data: unknown): string {
  let out: string;
  try {
    out = JSON.stringify(data, makeReplacer());
  } catch (err) {
    return `<unserializable: ${(err as Error).message}>`;
  }
  if (out && out.length > MAX_TOTAL_LEN) {
    out = `${out.slice(0, MAX_TOTAL_LEN)}...(truncated)`;
  }
  return out;
}

/**
 * Format a single IPC message into a one-line log string.
 * @param direction e.g. 'master->app#12345' / 'app#12345<-master'
 * @param msg       the message body (supports cluster internal msgs via `action: 'cluster:<act>'`)
 * @param handle    optional handle (net.Socket / net.Server / TCP) attached to the IPC message
 */
export function formatIpcMessage(
  direction: string,
  msg: Partial<MessageBody> & { action?: string; data?: unknown },
  handle?: unknown,
): string {
  const action = msg?.action ?? '<unknown>';
  let out = `[${direction}] action=${action}`;
  if (msg && msg.data !== undefined) {
    out += ` data=${stringifyData(msg.data)}`;
  }
  if (handle) {
    out += ` +handle=${describeHandle(handle)}`;
  }
  return out;
}
