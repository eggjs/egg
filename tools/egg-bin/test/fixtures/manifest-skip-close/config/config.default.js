import path from 'node:path';

export default (appInfo) => {
  return {
    logger: {
      dir: path.join(appInfo.baseDir, 'logs'),
    },
  };
};
