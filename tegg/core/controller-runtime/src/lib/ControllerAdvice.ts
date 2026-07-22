import type { ControllerAdviceMeta } from '@eggjs/controller-decorator';
import type { EggContainerFactory } from '@eggjs/tegg-runtime';
import type { ControllerAdviceContext } from '@eggjs/tegg-types';

class ControllerAdviceInvocationContext<TContext> implements ControllerAdviceContext<TContext> {
  readonly controllerContext: TContext;
  that: object;
  method: PropertyKey;
  args: any[];
  readonly adviceParams = undefined;
  readonly #state = new Map<PropertyKey, any>();

  constructor(controllerContext: TContext, that: object, method: PropertyKey, args: any[]) {
    this.controllerContext = controllerContext;
    this.that = that;
    this.method = method;
    this.args = args;
  }

  get(key: PropertyKey): any | undefined {
    return this.#state.get(key);
  }

  set(key: PropertyKey, value: any): this {
    this.#state.set(key, value);
    return this;
  }
}

/** Executes every @Middleware Advice through its around hook. */
export async function executeControllerAdvices<TContext>(
  controllerContext: TContext,
  that: object,
  method: PropertyKey,
  args: any[],
  advices: readonly ControllerAdviceMeta[],
  eggContainerFactory: typeof EggContainerFactory,
  invoke: (that: object, args: any[]) => Promise<unknown>,
): Promise<unknown> {
  const adviceContext = new ControllerAdviceInvocationContext(controllerContext, that, method, args);
  let lastIndex = -1;

  const dispatch = async (index: number): Promise<unknown> => {
    if (index <= lastIndex) {
      throw new Error('controller advice next() called multiple times');
    }
    lastIndex = index;
    const advice = advices[index];
    if (!advice) {
      return invoke(adviceContext.that, adviceContext.args);
    }
    const eggObject = await eggContainerFactory.getOrCreateEggObjectFromClazz(advice.clazz, advice.objectName);
    const around = eggObject.obj.around;
    if (!around) {
      return dispatch(index + 1);
    }
    let nextCalled = false;
    let nextResult: unknown;
    const result = await around.call(eggObject.obj, adviceContext, async () => {
      nextCalled = true;
      nextResult = await dispatch(index + 1);
      return nextResult;
    });
    return result === undefined && nextCalled ? nextResult : result;
  };

  return dispatch(0);
}
