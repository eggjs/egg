import path from 'node:path';
import assert from 'node:assert';
import ExtendGenerator from '../../dist/generators/extend';
import { triggerGenerator } from './utils';

describe('generators/extend.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');

  it('should works without error', () => {
    const result = triggerGenerator('extend', appDir, 'application.ts');
    const item = result[0];
    assert(item.dist === path.resolve(appDir, './typings/app/extend/application.d.ts'));
    assert(item.content!.includes('../../../app/extend/application'));
    assert(item.content!.includes('type ExtendApplicationType = typeof ExtendApplication;'));
    assert(item.content!.includes('interface Application extends ExtendApplicationType { }'));
  });

  it('should support appoint framework', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app2');
    const result = triggerGenerator('extend', newAppDir, 'application.ts');
    const item = result[0];
    assert(item.content!.includes('declare module \'larva\''));
  });

  it('should works without extend directory', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app8');
    const result = triggerGenerator('extend', newAppDir, 'application.ts');
    assert(result.length === 1);
  });

  it('should works without forwarding file', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app8');
    const result = triggerGenerator('extend', newAppDir);
    assert(result.length === Object.keys(ExtendGenerator.defaultConfig.interface).length);
  });

  it('should not generate dts with unknown interface', () => {
    const result = triggerGenerator('extend', appDir, 'whatever.ts');
    assert(!result.length);
  });

  it('should not generate dts with empty extension', () => {
    const result = triggerGenerator('extend', appDir, 'request.ts');
    const item = result[0];
    assert(item.dist.includes('request.d.ts'));
    assert(!item.content);
  });

  it('should works without error with helper', () => {
    const result = triggerGenerator('extend', appDir, 'helper.ts');
    const item = result[0];
    assert(item.content!.includes('../../../app/extend/helper'));
    assert(item.content!.includes('type ExtendIHelperType = typeof ExtendIHelper'));
    assert(item.content!.includes('interface IHelper extends ExtendIHelperType { }'));
  });

  it('should works with env', () => {
    const result = triggerGenerator('extend', appDir, 'application.unittest.ts');
    const item = result[0];
    assert(item.dist === path.resolve(appDir, './typings/app/extend/application.unittest.d.ts'));
    assert(item.content!.includes('../../../app/extend/application.unittest'));
    assert(item.content!.includes('type ExtendUnittestApplicationType = typeof ExtendUnittestApplication;'));
    assert(item.content!.includes('interface Application extends ExtendUnittestApplicationType { }'));
  });

});
