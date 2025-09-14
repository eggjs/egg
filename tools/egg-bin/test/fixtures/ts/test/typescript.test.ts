import assert from 'node:assert';
import obj from './sub';

describe('typescript.test.ts', () => {
  it('should success', () => {
    console.log('###', obj.name);
    assert.equal(obj.name, 'egg from ts');
  });

  it('should fail', () => {
    console.log('###', obj.name);
    assert.equal(obj.name, 'wrong assert ts');
  });
});
