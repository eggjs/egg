import assert from 'node:assert';

import { QualifierUtil } from '@eggjs/core-decorator';
import { describe, it } from 'vitest';

describe('index.test.ts', () => {
  it('should success', async () => {
    const { Foo } = await import('./fixtures/modules/langchain/index.ts');
    const { ChatModelQualifierAttribute } = await import('../src/index.ts');
    const chatModelQualifier = QualifierUtil.getProperQualifier(Foo, 'chatModel', ChatModelQualifierAttribute);
    assert.equal(chatModelQualifier, 'chat');
  });
});
