import { ContextProto, Inject } from '@eggjs/tegg';
import { type Ajv, type Static, Type, TransformEnum } from '@eggjs/tegg/ajv';
import { Runner, type MainRunner } from '@eggjs/tegg/standalone';

const RequestBodySchema = Type.Object({
  fullname: Type.String({
    transform: [TransformEnum.trim],
    maxLength: 100,
  }),
  skipDependencies: Type.Boolean(),
  registryName: Type.Optional(Type.String()),
});

type RequestBody = Static<typeof RequestBodySchema>;

@ContextProto()
@Runner()
export class Foo implements MainRunner<string> {
  @Inject()
  private readonly ajv: Ajv;

  async main(): Promise<string> {
    const body: RequestBody = {
      fullname: 'mock fullname',
      skipDependencies: true,
      registryName: 'ok',
    };
    this.ajv.validate(RequestBodySchema, body);
    return JSON.stringify({
      body,
    });
  }
}
