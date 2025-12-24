import { expect, test } from '@voidzero-dev/vite-plus/test';

import {
  Acl,
  InjectContext,
  HTTPContext,
  ContextProto,
  Inject,
  AccessLevel,
  EventInfoUtil,
  QualifierImplUtil,
  BackgroundTaskHelper,
  orm,
  aop,
} from '../src/index.ts';

test('should exports work', async () => {
  expect(Acl).toBeDefined();
  expect(InjectContext).toBeDefined();
  expect(HTTPContext).toBeDefined();
  expect(ContextProto).toBeDefined();
  expect(Inject).toBeDefined();
  expect(AccessLevel).toBeDefined();
  expect(EventInfoUtil).toBeDefined();
  expect(QualifierImplUtil).toBeDefined();
  expect(BackgroundTaskHelper).toBeDefined();
  expect(orm.DataSource).toBeDefined();
  expect(orm.Attribute).toBeDefined();
  expect(aop.Advice).toBeDefined();
});
