import { Messenger as LocalMessenger } from './local.js';
import { Messenger as IPCMessenger } from './ipc.js';
import type { IMessenger } from './IMessenger.js';
import type { EggApplicationCore } from '../../egg.js';

export type { IMessenger } from './IMessenger.js';

/**
 * @class Messenger
 */
export function create(egg: EggApplicationCore): IMessenger {
  return egg.options.mode === 'single'
    ? new LocalMessenger(egg)
    : new IPCMessenger();
}
