import { Messenger as LocalMessenger } from './local.js';
import { Messenger as IPCMessenger } from './ipc.js';
import type { IMessenger } from './IMessenger.js';
import type { EggApplication } from '../../egg.js';

export type { IMessenger } from './IMessenger.js';

/**
 * @class Messenger
 */
export function create(egg: EggApplication): IMessenger {
  return egg.options.mode === 'single'
    ? new LocalMessenger(egg)
    : new IPCMessenger();
}
