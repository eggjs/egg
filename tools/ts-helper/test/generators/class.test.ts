import path from 'node:path';
import assert from 'node:assert';
import { GeneratorResult } from '../../dist/';
import { triggerGenerator } from './utils';

describe('generators/class.test.ts', () => {
  const appDir = path.resolve(__dirname, '../fixtures/app');

  it('should works without error', () => {
    const result = triggerGenerator<GeneratorResult>('controller', appDir);
    assert(result.dist === path.resolve(appDir, './typings/app/controller/index.d.ts'));
    assert(result.content!.includes('../../../app/controller/home'));
    assert(result.content!.includes('interface IController'));
    assert(result.content!.includes('home: ExportHome;'));
    assert(result.content!.includes('multiParent: ExportMultiParent &'));
    assert(result.content!.includes('sub: ExportMultiParentSub;'));
    assert(!result.content!.includes('multi: ExportMulti'));
    assert(result.content!.includes('sub: ExportMultiSub;'));
  });

  it('should works without error with no interface', () => {
    const result = triggerGenerator<GeneratorResult>('controller', appDir);
    assert(result.dist === path.resolve(appDir, './typings/app/controller/index.d.ts'));
    assert(result.content!.includes('../../../app/controller/home'));
    assert(result.content!.includes('interface IController'));
    assert(result.content!.includes('home: ExportHome;'));
    assert(result.content!.includes('multiParent: ExportMultiParent &'));
    assert(result.content!.includes('sub: ExportMultiParentSub;'));
    assert(!result.content!.includes('multi: ExportMulti'));
    assert(result.content!.includes('sub: ExportMultiSub;'));
  });

  it('should support interfaceHandle is string', () => {
    const result = triggerGenerator<GeneratorResult>('controller', appDir, undefined, {
      interfaceHandle: 'InstanceOf<{{ 0 }}>',
    });

    assert(result.content!.includes('home: InstanceOf<ExportHome>;'));
  });

  it('should works with middleware without error', () => {
    const result = triggerGenerator<GeneratorResult>('middleware', appDir);
    assert(result.dist === path.resolve(appDir, './typings/app/middleware/index.d.ts'));
    assert(result.content!.includes('../../../app/middleware/uuid'));
    assert(result.content!.includes('interface IMiddleware'));
    assert(result.content!.includes('uuid: typeof ExportUuid;'));
  });

  it('should support declareTo with model without error', () => {
    const result = triggerGenerator<GeneratorResult>('model', appDir, undefined, {
      declareTo: 'Context.model',
    });

    assert(result.dist === path.resolve(appDir, './typings/app/model/index.d.ts'));
    assert(result.content!.includes('interface Context {\n    model: IModel;\n  }'));
    assert(result.content!.includes('../../../app/model/User'));
    assert(result.content!.includes('interface IModel'));
    assert(result.content!.includes('User: ReturnType<typeof ExportUser>;'));
    assert(result.content!.includes('Person: ReturnType<typeof ExportPerson>;'));
  });

  it('should support interfaceHandle with model without error', () => {
    const result = triggerGenerator<GeneratorResult>('model', appDir, undefined, {
      generator: 'function',
      declareTo: 'Context.model',
      interfaceHandle: 'InstanceOf<ReturnType<typeof {{ 0 }}>>',
    });

    assert(result.content!.includes('User: InstanceOf<ReturnType<typeof ExportUser>>;'));
  });

  it('should support interfaceHandle with middleware without error', () => {
    const result = triggerGenerator<GeneratorResult>('middleware', appDir, undefined, {
      interfaceHandle: 'InstanceOf<typeof {{ 0 }}>',
    });

    assert(result.content!.includes('uuid: InstanceOf<typeof ExportUuid>;'));
  });

  it('should support function generator', () => {
    const result = triggerGenerator<GeneratorResult>('model', appDir, undefined, {
      generator: 'function',
      declareTo: 'Context.model',
      interfaceHandle: undefined,
    });

    assert(result.content!.includes('User: ReturnType<typeof ExportUser>;'));
  });

  it('should support object generator', () => {
    const result = triggerGenerator<GeneratorResult>('model', appDir, undefined, {
      generator: 'object',
      declareTo: 'Context.model',
      interfaceHandle: undefined,
    });

    assert(result.content!.includes('User: typeof ExportUser;'));
  });

  it('should support auto generator', () => {
    const result = triggerGenerator<GeneratorResult>('model', appDir, undefined, {
      generator: 'auto',
      declareTo: 'Context.model',
      interfaceHandle: undefined,
    });

    assert(result.content!.includes('User: AutoInstanceType<typeof ExportUser>;'));
  });

  it('should support appoint framework', () => {
    const newAppDir = path.resolve(__dirname, '../fixtures/app2');
    const result = triggerGenerator<GeneratorResult>('controller', newAppDir);
    assert(result.content!.includes('declare module \'larva\''));
  });
});
