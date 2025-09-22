import path from 'node:path';
import fs from 'node:fs/promises';

import { readJSON } from 'utility';
import type { Application, MiddlewareFunc } from 'egg';

import { isTimingFile } from '../../utils.ts';

export default function createEggLoaderTraceMiddleware(_options: unknown, app: Application): MiddlewareFunc {
  return async (ctx, next) => {
    if (ctx.path !== '/__loader_trace__') {
      return await next();
    }
    const templatePath = path.join(import.meta.dirname, 'loader_trace.html');
    const template = await fs.readFile(templatePath, 'utf8');
    const data = await loadTimingData(app);
    ctx.body = template.replace('{{placeholder}}', JSON.stringify(data));
  };
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
