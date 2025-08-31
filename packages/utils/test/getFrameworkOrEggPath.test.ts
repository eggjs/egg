import { strict as assert } from 'node:assert';
import utils from '../src/index.js';
import { getFilepath } from './helper.js';

describe('test/getFrameworkOrEggPath.test.ts', () => {
  it('get framework dir path success', () => {
    const dirpath = utils.getFrameworkOrEggPath(getFilepath('aliyun-egg-app'));
    assert.equal(dirpath, getFilepath('aliyun-egg-app/node_modules/aliyun-egg'));
  });

  it('get custom framework dir path success when app set app.framework on package.json', () => {
    const dirpath = utils.getFrameworkOrEggPath(getFilepath('yadan-app'));
    assert.equal(dirpath, getFilepath('yadan-app/node_modules/yadan'));
  });

  it('get custom egg dir path success', () => {
    const dirpath = utils.getFrameworkOrEggPath(getFilepath('aliyun-egg-app'), [ 'my-old-egg', 'my-new-egg' ]);
    assert.equal(dirpath, getFilepath('aliyun-egg-app/node_modules/my-new-egg'));
  });

  it('get default egg dir path success', () => {
    const dirpath = utils.getFrameworkOrEggPath(getFilepath('default-egg-app'));
    assert.equal(dirpath, getFilepath('default-egg-app/node_modules/egg'));
  });

  it('get "" when egg name not found', () => {
    const dirpath = utils.getFrameworkOrEggPath(getFilepath('aliyun-egg-app'), [ 'my-egg' ]);
    assert.equal(dirpath, '');
  });

  it('get "" when node_modules not found', () => {
    const dirpath = utils.getFrameworkOrEggPath(getFilepath('aliyun-egg-app-not-exists'));
    assert.equal(dirpath, '');
  });

  it('get "" when framework package.json not exists', () => {
    const dirpath = utils.getFrameworkOrEggPath(getFilepath('demoframework-app'));
    assert.equal(dirpath, '');
  });
});
