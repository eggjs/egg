export type QualifierAttribute = symbol | string;
export type QualifierValue = string | number;

/**
 * To locate prototype
 *
 * Example:
 * Has a decorator named HelloService
 * value is:
 * - Email
 * - Message
 *
 * interface HelloService {
 *   hello(name: string): Promise<void>;
 * }
 *
 * \@ContextProto({ name: 'helloService' })
 * \@HelloService(HelloServiceType.Email)
 * class EmailHelloService implement HelloService {
 *   ...
 * }
 *
 * \@ContextProto({ name: 'helloService' })
 * \@HelloService(HelloServiceType.Message)
 * class MessageHelloService implement HelloService {
 *   ...
 * }
 *
 * \@ContextProto()
 * class HelloFacade {
 *   \@Inject
 *   \@HelloService(HelloServiceType.Message)
 *   helloService: HelloService;
 * }
 */
export interface QualifierInfo {
  attribute: QualifierAttribute;
  value: QualifierValue;
}
