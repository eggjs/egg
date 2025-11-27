import type { EggApplicationCore } from '../../egg.ts';
import type { IMessenger } from './IMessenger.ts';
import { Messenger as IPCMessenger } from './ipc.ts';
import { Messenger as LocalMessenger } from './local.ts';

export type { IMessenger } from './IMessenger.ts';

/**
 * @class Messenger
 */
export function create(egg: EggApplicationCore): IMessenger {
  const messenger = egg.options.mode === 'single' ? new LocalMessenger(egg) : new IPCMessenger(egg);
  return messenger;
}
