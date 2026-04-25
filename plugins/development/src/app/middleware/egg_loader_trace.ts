import fs from 'node:fs/promises';
import path from 'node:path';

import type { Application, MiddlewareFunc } from 'egg';
import { readJSON } from 'utility';

import { isTimingFile } from '../../utils.ts';
import { LOADER_TRACE_TEMPLATE } from './loader-trace-template.ts';

export default function createEggLoaderTraceMiddleware(_options: unknown, app: Application): MiddlewareFunc {
  return async (ctx, next) => {
    if (ctx.path !== '/__loader_trace__') {
      return await next();
    }
    const data = await loadTimingData(app);
    const serializedData = serializeLoaderTraceData(data);
    ctx.body = LOADER_TRACE_TEMPLATE.replace('{{placeholder}}', () => serializedData);
  };
}

function serializeLoaderTraceData(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function loadTimingData(app: Application) {
  const rundir = app.config.rundir;
  const files = await fs.readdir(rundir);
  const data: unknown[] = [];
  for (const file of files) {
    if (!isTimingFile(file)) continue;
    const json = await readJSON(path.join(rundir, file));
    const isAgent = file.startsWith('agent');
    for (const item of json) {
      if (isAgent) {
        item.type = 'agent';
      } else {
        item.type = `app_${item.pid}`;
      }
      item.pid = String(item.pid);
      item.range = [item.start, item.end];
      item.title = `${item.type}(${item.index})`;
      data.push(item);
    }
  }
  return data;
}
