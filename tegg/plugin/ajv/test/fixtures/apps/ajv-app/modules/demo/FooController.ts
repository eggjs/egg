import { HTTPController, HTTPMethod, HTTPMethodEnum, Inject, HTTPBody } from '@eggjs/tegg';
import { type Ajv, type Static, Type, TransformEnum } from '@eggjs/tegg/ajv';

const RequestBodySchema = Type.Object({
  fullname: Type.String({
    transform: [TransformEnum.trim],
    maxLength: 100,
  }),
  skipDependencies: Type.Boolean(),
  registryName: Type.Optional(Type.String()),
});

type RequestBody = Static<typeof RequestBodySchema>;

@HTTPController()
export class FooController {
  @Inject()
  private readonly ajv: Ajv;

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/foo',
  })
  async echo(@HTTPBody() body: RequestBody) {
    this.ajv.validate(RequestBodySchema, body);
    return {
      body,
    };
  }
}
