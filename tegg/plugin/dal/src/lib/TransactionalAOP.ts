import { Advice, type AdviceContext, type IAdvice } from '@eggjs/tegg/aop';
import { AccessLevel, type EggProtoImplClass, ObjectInitType } from '@eggjs/tegg';
import { PropagationType } from '@eggjs/tegg/transaction';
import { MysqlDataSource } from '@eggjs/dal-runtime';

export interface TransactionalParams {
  propagation: PropagationType;
  dataSourceGetter: () => MysqlDataSource;
}

@Advice({
  accessLevel: AccessLevel.PUBLIC,
  initType: ObjectInitType.SINGLETON,
})
export class TransactionalAOP implements IAdvice<EggProtoImplClass, TransactionalParams> {
  public async around(
    ctx: AdviceContext<EggProtoImplClass, TransactionalParams>,
    next: () => Promise<any>
  ): Promise<void> {
    const { propagation, dataSourceGetter } = ctx.adviceParams!;
    const dataSource = dataSourceGetter();
    if (propagation === PropagationType.ALWAYS_NEW) {
      return await dataSource.beginTransactionScope(next);
    }
    return await dataSource.beginTransactionScope(next);
  }
}
