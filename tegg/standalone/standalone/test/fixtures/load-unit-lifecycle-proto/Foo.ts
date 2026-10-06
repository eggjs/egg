import { InnerObjectProto } from '@eggjs/tegg';

@InnerObjectProto()
export class Foo {
  getName() {
    return 'foo fake name';
  }
}
