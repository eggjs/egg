import { AccessLevel, Inject, InnerObjectProto } from '@eggjs/tegg';

@InnerObjectProto()
export class InnerFoo {
  message = 'inner foo';
}

@InnerObjectProto({ accessLevel: AccessLevel.PUBLIC })
export class InnerBar {
  @Inject()
  innerFoo: InnerFoo;

  message() {
    return 'with inner bar and ' + this.innerFoo.message;
  }
}
