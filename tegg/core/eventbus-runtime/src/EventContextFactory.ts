import { SingletonProto } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';
import type { EggRuntimeContext } from '@eggjs/tegg-types';

export type ContextCreator = (parentContext?: EggRuntimeContext) => EggRuntimeContext;

@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class EventContextFactory {
  private creator: ContextCreator;

  createContext(parentContext?: EggRuntimeContext): EggRuntimeContext {
    return this.creator(parentContext);
  }

  registerContextCreator(creator: ContextCreator) {
    this.creator = creator;
  }
}
