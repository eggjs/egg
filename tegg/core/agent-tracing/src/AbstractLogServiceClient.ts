/**
 * Abstract log service client for dependency injection.
 *
 * To enable log service syncing in TracingService, implement this class in your application
 * and register it with Tegg IoC. The implementation class MUST be named `LogServiceClient`
 * (or use `@SingletonProto({ name: 'logServiceClient' })`) so the container can resolve it.
 *
 * @example
 * ```typescript
 * import { SingletonProto } from '@eggjs/core-decorator';
 * import { AccessLevel } from '@eggjs/tegg-types';
 * import { AbstractLogServiceClient } from '@eggjs/agent-tracing';
 *
 * // Class name must be LogServiceClient (registers as 'logServiceClient' in the IoC container)
 * @SingletonProto({ accessLevel: AccessLevel.PUBLIC })
 * export class LogServiceClient extends AbstractLogServiceClient {
 *   async send(log: string): Promise<void> {
 *     await fetch('https://log.example.com/api', {
 *       method: 'POST',
 *       headers: { 'content-type': 'application/json' },
 *       body: JSON.stringify({ log }),
 *     });
 *   }
 * }
 * ```
 *
 * If no implementation is registered, log service syncing is silently skipped.
 */
export abstract class AbstractLogServiceClient {
  abstract send(log: string): Promise<void>;
}
