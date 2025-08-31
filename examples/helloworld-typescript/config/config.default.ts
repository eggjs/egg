import { EggAppConfig } from 'egg';

export default () => {
  return {
    keys: '123456',
  } as Partial<EggAppConfig>;
};
