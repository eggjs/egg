import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import mm from 'mm';
import { describe, it, beforeEach, afterEach, afterAll } from 'vitest';

import { levels, Transport, FileTransport, FileBufferTransport, ConsoleTransport } from '../../../src/index.ts';
import { rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('test/lib/transports/transport.test.ts', () => {
  const tmp = path.join(__dirname, '../../fixtures/tmp_transport');
  let filepath: string;

  beforeEach(() => {
    filepath = path.join(tmp, `transport-${Date.now()}`, 'a.log');
  });

  afterEach(() => {
    mm.restore();
  });

  afterAll(async () => {
    await rimraf(tmp);
  });

  it('should always create new options', () => {
    const options = {};
    const transport = new Transport(options);
    assert(transport.options !== options);
  });

  it('Transport default params', () => {
    const transport = new Transport();
    assert.deepStrictEqual(transport.options, {
      level: levels.NONE,
      formatter: null,
      contextFormatter: null,
      json: false,
      encoding: 'utf8',
      eol: os.EOL,
    });
  });

  it('should override Transport default params', () => {
    const formatter = (meta: object) => meta;
    const transport = new Transport({ level: 'INFO', formatter: formatter as never });
    assert.strictEqual(transport.options.level, levels.INFO);
    assert.strictEqual(transport.options.formatter, formatter);
  });

  it('should not log when disabled', () => {
    const transport = new Transport({ level: 'INFO' });
    assert.strictEqual(transport.enabled, true);
    transport.disable();
    assert.strictEqual(transport.enabled, false);
    assert.strictEqual(transport.shouldLog('INFO'), false);
    transport.enable();
    assert.strictEqual(transport.enabled, true);
  });

  it('should set level', () => {
    const transport = new Transport({ level: 'INFO' });
    assert.strictEqual(transport.level, levels.INFO);
    transport.level = 'WARN';
    assert.strictEqual(transport.level, levels.WARN);
  });

  it('FileTransport default level should be INFO', () => {
    const transport = new FileTransport({ file: filepath });
    assert.strictEqual(transport.level, levels.INFO);
    transport.close();
  });

  it('FileBufferTransport default level should be INFO', () => {
    const transport = new FileBufferTransport({ file: filepath });
    assert.strictEqual(transport.level, levels.INFO);
    transport.close();
  });

  it('ConsoleTransport default stderrLevel should be ERROR', () => {
    const transport = new ConsoleTransport();
    assert.strictEqual(transport.options.stderrLevel, levels.ERROR);
  });
});
