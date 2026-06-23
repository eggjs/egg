import { AccessLevel, SingletonProto } from '@eggjs/tegg';

/**
 * Per-app singleton state. The SAME class is loaded by two apps; each app must
 * get its OWN CounterService instance:
 * - `count`      — plain singleton state (the baseline isolation check)
 * - `eventCount` — incremented by the EventBus handler (emit-path isolation)
 * - `store`      — an in-memory data store standing in for a DB / cache holder
 *                  (per-app stateful-singleton isolation; real dal datasource
 *                  isolation is covered by the dal-plugin tests)
 */
@SingletonProto({ accessLevel: AccessLevel.PUBLIC })
export class CounterService {
  private count = 0;
  private eventCount = 0;
  private readonly store = new Map<string, number>();

  increment(): void {
    this.count++;
  }

  getCount(): number {
    return this.count;
  }

  onEvent(delta: number): void {
    this.eventCount += delta;
  }

  getEventCount(): number {
    return this.eventCount;
  }

  save(key: string, value: number): void {
    this.store.set(key, value);
  }

  load(key: string): number | undefined {
    return this.store.get(key);
  }
}
