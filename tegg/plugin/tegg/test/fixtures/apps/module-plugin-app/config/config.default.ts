import type { EggAppConfig } from 'egg';

export default function (): Partial<EggAppConfig> {
  return {
    keys: 'test key',
  };
}
