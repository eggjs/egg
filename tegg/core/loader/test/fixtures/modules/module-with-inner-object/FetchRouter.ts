import { InnerObjectProto } from '@eggjs/core-decorator';

@InnerObjectProto()
export class FetchRouter {
  routes(): string[] {
    return [];
  }
}
