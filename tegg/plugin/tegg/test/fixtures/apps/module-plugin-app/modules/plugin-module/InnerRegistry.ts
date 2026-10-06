import { AccessLevel, Inject, InnerObjectProto } from '@eggjs/tegg';

@InnerObjectProto()
export class InnerCounter {
  count = 0;

  next(): number {
    return ++this.count;
  }
}

@InnerObjectProto({ accessLevel: AccessLevel.PUBLIC })
export class InnerRegistry {
  @Inject()
  innerCounter: InnerCounter;

  readonly createdLoadUnits: string[] = [];

  record(loadUnitName: string): void {
    this.createdLoadUnits.push(`${this.innerCounter.next()}:${loadUnitName}`);
  }
}
