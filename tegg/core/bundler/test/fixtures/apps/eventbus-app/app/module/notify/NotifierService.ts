import { SingletonProto, AccessLevel, Inject } from '@eggjs/core-decorator';

import type { UserService } from './UserService.ts';

/**
 * Simulates the framework's EventBus built-in.
 * NOT decorated with @SingletonProto, so it is NOT registered in GlobalGraph.
 * The bundler/DependencyResolver must silently skip it without crashing.
 */
class EventBus {
  emit(_event: string, _data: unknown): void {}
}

/**
 * Service that injects both a user-defined service AND the framework built-in EventBus.
 * The bundler must gracefully skip EventBus (not in GlobalGraph) without crashing.
 */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class NotifierService {
  @Inject()
  private userService: UserService;

  // Framework built-in - NOT a user-defined proto, not resolvable in GlobalGraph
  @Inject()
  private eventBus: EventBus;

  async notifyUser(userId: string): Promise<void> {
    const user = await this.userService.find(userId);
    this.eventBus.emit('user.notified', { userId: user.id });
  }
}
