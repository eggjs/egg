import assert from 'node:assert';

import { QualifierUtil } from '@eggjs/core-decorator';
import { describe, it } from 'vitest';

describe('index.test.ts', () => {
  // https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain/package.json#L9
  if (parseInt(process.version.slice(1, 3)) > 19) {
    it('should success', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Foo } = require('./fixtures/modules/langchain');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ChatModelQualifierAttribute } = require('../');
      const chatModelQualifier = QualifierUtil.getProperQualifier(Foo, 'chatModel', ChatModelQualifierAttribute);
      assert.equal(chatModelQualifier, 'chat');
    });
  }
});
