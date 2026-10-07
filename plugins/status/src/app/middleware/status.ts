import fs from 'node:fs/promises';

import type { Application, MiddlewareFunc } from 'egg';

import type { StatusConfig } from '../../config/config.default.ts';

async function existsFile(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

export default (options: StatusConfig, app: Application): MiddlewareFunc => {
  const {
    availableResponseKeyword,
    unavailableResponseKeyword,
    unavailableResponseStatus,
    checkStatusURLs,
    checkStatusFiles,
  } = options;
  const starttime = Date();

  return async function serverStatus(ctx, next) {
    if (!checkStatusURLs.includes(ctx.path)) {
      return next();
    }

    let exists = false;
    for (const statusFile of checkStatusFiles) {
      if (await existsFile(statusFile)) {
        exists = true;
        break;
      }
    }
    const keyword = exists ? availableResponseKeyword : unavailableResponseKeyword;
    ctx.status = exists ? 200 : unavailableResponseStatus;
    ctx.body = `${app.name} (${starttime} ~ ${Date()}), status: ${keyword}`;
  };
};
