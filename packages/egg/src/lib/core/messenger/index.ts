import { Messenger as LocalMessenger } from './local.ts';
import { Messenger as IPCMessenger } from './ipc.ts';
import type { IMessenger } from './IMessenger.ts';
import type { EggApplicationCore } from '../../egg.ts';

export type { IMessenger } from './IMessenger.ts';

/**
 * @class Messenger
 */
export function create(egg: EggApplicationCore): IMessenger {
  const messenger =
    egg.options.mode === 'single'
      ? new LocalMessenger(egg)
      : new IPCMessenger(egg);
  return messenger;
}
