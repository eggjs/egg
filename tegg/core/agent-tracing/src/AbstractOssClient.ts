/**
 * Abstract OSS client for dependency injection.
 *
 * To enable OSS uploads in TracingService, implement this class in your application
 * and register it with Tegg IoC. The implementation class MUST be named `OssClient`
 * (or use `@SingletonProto({ name: 'ossClient' })`) so the container can resolve it.
 *
 * @example
 * ```typescript
 * import { SingletonProto } from '@eggjs/core-decorator';
 * import { AccessLevel } from '@eggjs/tegg-types';
 * import { AbstractOssClient } from '@eggjs/agent-tracing';
 *
 * // Class name must be OssClient (registers as 'ossClient' in the IoC container)
 * @SingletonProto({ accessLevel: AccessLevel.PUBLIC })
 * export class OssClient extends AbstractOssClient {
 *   async put(key: string, content: string | Buffer): Promise<void> {
 *     // your OSS implementation here
 *   }
 * }
 * ```
 *
 * If no implementation is registered, OSS uploads are silently skipped.
 */
export abstract class AbstractOssClient {
  abstract put(key: string, content: string | Buffer): Promise<void>;
}
