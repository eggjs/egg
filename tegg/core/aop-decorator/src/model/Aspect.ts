import type { AdviceInfo, AspectAdvice, EggProtoImplClass, IAdvice } from '@eggjs/tegg-types';

export class Aspect {
  readonly clazz: EggProtoImplClass;
  readonly method: PropertyKey;
  readonly adviceList: readonly AspectAdvice[];

  constructor(clazz: EggProtoImplClass, method: PropertyKey, adviceList: readonly AspectAdvice[]) {
    this.clazz = clazz;
    this.method = method;
    this.adviceList = adviceList;
  }
}

export class AspectBuilder {
  readonly clazz: EggProtoImplClass;
  readonly method: PropertyKey;
  private readonly adviceList: Array<AdviceInfo>;

  constructor(clazz: EggProtoImplClass, method: PropertyKey) {
    this.clazz = clazz;
    this.method = method;
    this.adviceList = [];
  }

  addAdvice(adviceInfo: AdviceInfo) {
    this.adviceList.push(adviceInfo);
  }

  build(): Aspect {
    this.adviceList.sort((a, b) => a.order - b.order);
    const aspectAdviceList = this.adviceList.map((t, i) => {
      return {
        clazz: t.clazz,
        name: this.adviceName(t.clazz, i),
        adviceParams: t.adviceParams,
      };
    });
    return new Aspect(this.clazz, this.method, aspectAdviceList);
  }

  private adviceName(advice: EggProtoImplClass<IAdvice>, index: number) {
    return `${this.clazz.name}#${String(this.method)}#${advice.name}#${index}`;
  }
}
