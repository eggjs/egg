import { EggLoader } from '@eggjs/core';

export abstract class EggApplicationLoader extends EggLoader {
  abstract load(): Promise<void>;
}
