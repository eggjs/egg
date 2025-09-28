import * as path from 'path';
import { EggAppInfo, EggAppConfig, PowerPartial } from 'egg';

export default (appInfo: EggAppInfo) => {
  const config = {} as PowerPartial<EggAppConfig>;

  config.keys = '123123';

  config.view = {
    root: path.resolve(appInfo.baseDir, './'),
  };
};
