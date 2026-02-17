import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import formstream from 'formstream';
import { describe, it, beforeAll, afterAll } from 'vitest';

import { parse } from '../src/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface MockRequest {
  headers: Record<string, string>;
  end: (data: string) => void;
  pipe: (dest: NodeJS.WritableStream) => NodeJS.WritableStream;
  on: (event: string, handler: (...args: unknown[]) => void) => MockRequest;
  removeListener: (event: string, handler: (...args: unknown[]) => void) => MockRequest;
}

function request(): MockRequest {
  const stream = new PassThrough() as MockRequest & PassThrough;

  stream.headers = {
    'content-type': 'multipart/form-data; boundary=---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
  };

  stream.end(
    [
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="file_name_0"',
      '',
      'super alpha file',
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="file_name_0"',
      '',
      'super beta file',
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="file_name_0"',
      '',
      'super gamma file',
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="file_name_1"',
      '',
      'super gamma file',
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="_csrf"',
      '',
      'ooxx',
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="hasOwnProperty"',
      '',
      'super bad file',
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="upload_file_0"; filename="1k_a.dat"',
      'Content-Type: application/octet-stream',
      '',
      'A'.repeat(1024),
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="upload_file_1"; filename="1k_b.dat"',
      'Content-Type: application/octet-stream',
      '',
      'B'.repeat(1024),
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="upload_file_2"; filename="hack.exe"',
      'Content-Type: application/octet-stream',
      '',
      'A'.repeat(1024),
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k--',
    ].join('\r\n'),
  );

  return stream as unknown as MockRequest;
}

function gziped(): MockRequest & { pipe: (dest: NodeJS.WritableStream) => NodeJS.WritableStream } {
  const stream = request();
  const oldHeaders = stream.headers;
  const gzipStream = (stream as unknown as PassThrough).pipe(zlib.createGzip()) as unknown as MockRequest;
  gzipStream.headers = oldHeaders;
  gzipStream.headers['content-encoding'] = 'gzip';

  return gzipStream as MockRequest & { pipe: (dest: NodeJS.WritableStream) => NodeJS.WritableStream };
}

function invalidRequest(): MockRequest {
  const stream = new PassThrough() as MockRequest & PassThrough;

  stream.headers = {
    'content-type': 'multipart/form-data; boundary=---------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
  };

  stream.end(
    [
      '-----------------------------paZqsnEHRufoShdX6fh0lUhXBP4k',
      'Content-Disposition: form-data; name="upload_file_0"; filename="1k_a.dat"',
      'Content-Type: application/octet-stream',
      '',
      'A'.repeat(57),
      '-----------------------------invalid',
      'Content-Disposition: form-data; name="upload_file_2"; filename="hack.exe"',
      'Content-Type: application/octet-stream',
      '',
      'A'.repeat(57),
      '-----------------------------invalid--',
    ].join('\r\n'),
  );

  return stream as unknown as MockRequest;
}

function malformatMultipart(): MockRequest {
  const stream = new PassThrough() as MockRequest & PassThrough;

  stream.headers = {
    'content-type': 'multipart/form-data; boundary=test123',
  };

  stream.end(
    '--test123\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nhello\r\n--test123--\r\n',
  );

  return stream as unknown as MockRequest;
}

describe('Co Busboy', () => {
  it('should work without autofields', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> });
    let part;
    let fields = 0;
    let streams = 0;

    while ((part = await parts())) {
      if (Array.isArray(part)) {
        assert.strictEqual(part.length, 4);
        fields++;
      } else {
        streams++;
        part.resume();
      }
    }

    assert.strictEqual(fields, 6);
    assert.strictEqual(streams, 3);
  });

  it('should work without autofields on gziped content', async () => {
    const parts = parse(gziped() as unknown as { headers: Record<string, string> });
    let part;
    let fields = 0;
    let streams = 0;

    while ((part = await parts())) {
      if (Array.isArray(part)) {
        assert.strictEqual(part.length, 4);
        fields++;
      } else {
        streams++;
        part.resume();
      }
    }

    assert.strictEqual(fields, 6);
    assert.strictEqual(streams, 3);
  });

  it('should work with autofields', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      autoFields: true,
    });
    let part;
    let fields = 0;
    let streams = 0;

    while ((part = await parts())) {
      if (Array.isArray(part)) {
        fields++;
      } else {
        streams++;
        part.resume();
      }
    }

    assert.strictEqual(fields, 0);
    assert.strictEqual(streams, 3);
    assert.strictEqual(parts.fields.length, 6);
    assert.strictEqual(Object.keys(parts.field).length, 3);
  });

  it('should work with autofields on gziped content', async () => {
    const parts = parse(gziped() as unknown as { headers: Record<string, string> }, {
      autoFields: true,
    });
    let part;
    let fields = 0;
    let streams = 0;

    while ((part = await parts())) {
      if (Array.isArray(part)) {
        fields++;
      } else {
        streams++;
        part.resume();
      }
    }

    assert.strictEqual(fields, 0);
    assert.strictEqual(streams, 3);
    assert.strictEqual(parts.fields.length, 6);
    assert.strictEqual(Object.keys(parts.field).length, 3);
  });

  it('should work with autofields and arrays', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      autoFields: true,
    });
    let part;

    while ((part = await parts())) {
      if (!Array.isArray(part)) {
        part.resume();
      }
    }

    assert.strictEqual(Object.keys(parts.field).length, 3);
    assert.strictEqual((parts.field['file_name_0'] as string[]).length, 3);
    assert.deepStrictEqual(parts.field['file_name_0'], ['super alpha file', 'super beta file', 'super gamma file']);
  });

  it('should work with delays', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      autoFields: true,
    });
    let part;
    let streams = 0;

    while ((part = await parts())) {
      if (!Array.isArray(part)) {
        streams++;
        part.resume();
        await wait(10);
      }
    }

    assert.strictEqual(streams, 3);
  });

  it('should not overwrite prototypes', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      autoFields: true,
    });
    let part;

    while ((part = await parts())) {
      if (!Array.isArray(part)) {
        part.resume();
      }
    }

    assert.strictEqual(parts.field.hasOwnProperty, Object.prototype.hasOwnProperty);
  });

  it('should throw error when the files limit is reached', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      limits: {
        files: 1,
      },
    });
    let part;
    let error: (Error & { status?: number; code?: string }) | undefined;

    try {
      while ((part = await parts())) {
        if (!Array.isArray(part)) {
          part.resume();
        }
      }
    } catch (e) {
      error = e as Error & { status?: number; code?: string };
    }

    assert.strictEqual(error?.status, 413);
    assert.strictEqual(error?.code, 'Request_files_limit');
    assert.strictEqual(error?.message, 'Reach files limit');
  });

  it('should throw error when the fields limit is reached', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      limits: {
        fields: 1,
      },
    });
    let part;
    let error: (Error & { status?: number; code?: string }) | undefined;

    try {
      while ((part = await parts())) {
        if (!Array.isArray(part)) {
          part.resume();
        }
      }
    } catch (e) {
      error = e as Error & { status?: number; code?: string };
    }

    assert.strictEqual(error?.status, 413);
    assert.strictEqual(error?.code, 'Request_fields_limit');
    assert.strictEqual(error?.message, 'Reach fields limit');
  });

  it('should throw error when the parts limit is reached', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      limits: {
        parts: 1,
      },
    });
    let part;
    let error: (Error & { status?: number; code?: string }) | undefined;

    try {
      while ((part = await parts())) {
        if (!Array.isArray(part)) {
          part.resume();
        }
      }
    } catch (e) {
      error = e as Error & { status?: number; code?: string };
    }

    assert.strictEqual(error?.status, 413);
    assert.strictEqual(error?.code, 'Request_parts_limit');
    assert.strictEqual(error?.message, 'Reach parts limit');
  });

  it('should use options.checkField do csrf check', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      checkField: (name, value) => {
        if (name === '_csrf' && value !== 'pass') {
          return new Error('invalid csrf token');
        }
      },
    });
    let part;

    try {
      while ((part = await parts())) {
        if (Array.isArray(part)) {
          assert.strictEqual(part.length, 4);
        } else {
          part.resume();
        }
      }
      throw new Error('should not run this');
    } catch (err) {
      assert.strictEqual((err as Error).message, 'invalid csrf token');
    }
  });

  it('should use options.checkFile do filename extension check', async () => {
    const parts = parse(request() as unknown as { headers: Record<string, string> }, {
      checkFile: (_fieldname, _filestream, filename) => {
        if (path.extname(filename) !== '.dat') {
          return new Error('invalid filename extension');
        }
      },
    });
    let part;

    try {
      while ((part = await parts())) {
        if (Array.isArray(part)) {
          assert.strictEqual(part.length, 4);
        } else {
          part.resume();
        }
      }
      throw new Error('should not run this');
    } catch (err) {
      assert.strictEqual((err as Error).message, 'invalid filename extension');
    }
  });

  describe('checkFile()', () => {
    const logfile = path.join(__dirname, 'test.log');

    beforeAll(() => {
      fs.writeFileSync(logfile, Buffer.alloc(1024 * 1024 * 10));
    });

    afterAll(() => {
      fs.unlinkSync(logfile);
    });

    it('should checkFile fail', async () => {
      const form = formstream();

      form.field('foo1', 'fengmk2').field('love', 'chair1');
      form.file('file', logfile);
      form.field('foo2', 'fengmk2').field('love', 'chair2');

      const headers = form.headers();
      (form as unknown as { headers: Record<string, string> }).headers = {
        ...headers,
        'content-type': headers['Content-Type'],
      };

      const parts = parse(form as unknown as { headers: Record<string, string> }, {
        checkFile: (_fieldname, _fileStream, filename) => {
          const extname = filename && path.extname(filename);
          if (!extname || ['.jpg', '.png'].indexOf(extname.toLowerCase()) === -1) {
            const err = new Error('Invalid filename extension: ' + extname) as Error & { status?: number };
            err.status = 400;
            return err;
          }
        },
      });

      let part;
      let fileCount = 0;
      let fieldCount = 0;
      let err: Error | undefined;

      while (true) {
        try {
          part = await parts();
          if (!part) {
            break;
          }
        } catch (e) {
          err = e as Error;
          break;
        }

        if (!Array.isArray(part)) {
          fileCount++;
          part.resume();
        } else {
          fieldCount++;
        }
      }

      assert.strictEqual(fileCount, 0);
      assert.strictEqual(fieldCount, 4);
      assert.ok(err);
      assert.strictEqual(err.message, 'Invalid filename extension: .log');
    });

    it('should checkFile pass', async () => {
      const form = formstream();

      form.field('foo1', 'fengmk2').field('love', 'chair1');
      form.file('file', logfile);
      form.field('foo2', 'fengmk2').field('love', 'chair2');

      const headers = form.headers();
      (form as unknown as { headers: Record<string, string> }).headers = {
        ...headers,
        'content-type': headers['Content-Type'],
      };

      const parts = parse(form as unknown as { headers: Record<string, string> }, {
        checkFile: (_fieldname, _fileStream, filename) => {
          const extname = filename && path.extname(filename);
          if (!extname || ['.jpg', '.png', '.log'].indexOf(extname.toLowerCase()) === -1) {
            const err = new Error('Invalid filename extension: ' + extname) as Error & { status?: number };
            err.status = 400;
            return err;
          }
        },
      });

      let part;
      let fileCount = 0;
      let fieldCount = 0;
      let err: Error | undefined;

      while (true) {
        try {
          part = await parts();
          if (!part) {
            break;
          }
        } catch (e) {
          err = e as Error;
          break;
        }

        if (!Array.isArray(part)) {
          fileCount++;
          part.resume();
        } else {
          fieldCount++;
        }
      }

      assert.strictEqual(fileCount, 1);
      assert.strictEqual(fieldCount, 4);
      assert.ok(!err);
    });
  });

  describe('with promise', () => {
    it('should work without autofields', async () => {
      const parts = parse(request() as unknown as { headers: Record<string, string> });
      let promise;
      let part;
      let fields = 0;
      let streams = 0;

      while (((promise = parts()), (part = await promise))) {
        assert.ok(promise instanceof Promise);
        if (Array.isArray(part)) {
          assert.strictEqual(part.length, 4);
          fields++;
        } else {
          streams++;
          part.resume();
        }
      }

      assert.strictEqual(fields, 6);
      assert.strictEqual(streams, 3);
    });

    it('should work without autofields on gziped content', async () => {
      const parts = parse(gziped() as unknown as { headers: Record<string, string> });
      let promise;
      let part;
      let fields = 0;
      let streams = 0;

      while (((promise = parts()), (part = await promise))) {
        assert.ok(promise instanceof Promise);
        if (Array.isArray(part)) {
          assert.strictEqual(part.length, 4);
          fields++;
        } else {
          streams++;
          part.resume();
        }
      }

      assert.strictEqual(fields, 6);
      assert.strictEqual(streams, 3);
    });

    it('should work with autofields', async () => {
      const parts = parse(request() as unknown as { headers: Record<string, string> }, {
        autoFields: true,
      });
      let promise;
      let part;
      let fields = 0;
      let streams = 0;

      while (((promise = parts()), (part = await promise))) {
        assert.ok(promise instanceof Promise);
        if (Array.isArray(part)) {
          fields++;
        } else {
          streams++;
          part.resume();
        }
      }

      assert.strictEqual(fields, 0);
      assert.strictEqual(streams, 3);
      assert.strictEqual(parts.fields.length, 6);
      assert.strictEqual(Object.keys(parts.field).length, 3);
    });

    it('should work with autofields on gziped content', async () => {
      const parts = parse(gziped() as unknown as { headers: Record<string, string> }, {
        autoFields: true,
      });
      let promise;
      let part;
      let fields = 0;
      let streams = 0;

      while (((promise = parts()), (part = await promise))) {
        assert.ok(promise instanceof Promise);
        if (Array.isArray(part)) {
          fields++;
        } else {
          streams++;
          part.resume();
        }
      }

      assert.strictEqual(fields, 0);
      assert.strictEqual(streams, 3);
      assert.strictEqual(parts.fields.length, 6);
      assert.strictEqual(Object.keys(parts.field).length, 3);
    });
  });

  describe('with wrong encoding', () => {
    it('will get nothing if set wrong encoding on gziped content', async () => {
      const stream = gziped();
      delete (stream.headers as { 'content-encoding'?: string })['content-encoding'];

      const parts = parse(stream as unknown as { headers: Record<string, string> }, {
        autoFields: true,
      });
      let promise;
      let part;
      let fields = 0;
      let streams = 0;

      while (((promise = parts()), (part = await promise))) {
        assert.ok(promise instanceof Promise);
        if (Array.isArray(part)) {
          fields++;
        } else {
          streams++;
          part.resume();
        }
      }

      assert.strictEqual(fields, 0);
      assert.strictEqual(streams, 0);
      assert.strictEqual(parts.fields.length, 0);
      assert.strictEqual(Object.keys(parts.field).length, 0);
    });
  });

  describe('invalid multipart', () => {
    it('should handle error: Unexpected end of form', async () => {
      const parts = parse(invalidRequest() as unknown as { headers: Record<string, string> });
      let part;

      try {
        while ((part = await parts())) {
          if (!Array.isArray(part)) {
            part.resume();
          }
        }

        throw new Error('should not run this');
      } catch (err) {
        assert.strictEqual((err as Error).message, 'Unexpected end of form');
      }
    });

    it('should handle error: Unexpected end of form with checkFile', async () => {
      const parts = parse(invalidRequest() as unknown as { headers: Record<string, string> }, {
        checkFile: () => {
          return new Error('invalid filename extension');
        },
      });
      let part;

      try {
        while ((part = await parts())) {
          if (!Array.isArray(part)) {
            part.resume();
          }
        }

        throw new Error('should not run this');
      } catch (err) {
        assert.strictEqual((err as Error).message, 'Unexpected end of form');
      }
    });
  });

  describe('with malformat multipart', () => {
    it('will get nothing if receive malformat multipart', async () => {
      const stream = malformatMultipart();
      const parts = parse(stream as unknown as { headers: Record<string, string> }, {
        autoFields: true,
      });
      let promise;
      let part;
      let fields = 0;
      let streams = 0;

      try {
        while (((promise = parts()), (part = await promise))) {
          assert.ok(promise instanceof Promise);
          if (Array.isArray(part)) {
            fields++;
          } else {
            streams++;
            part.resume();
          }
        }
      } catch (err) {
        assert.strictEqual((err as Error).message, 'Malformed part header');
      }

      assert.strictEqual(fields, 0);
      assert.strictEqual(streams, 0);
      assert.strictEqual(parts.fields.length, 0);
      assert.strictEqual(Object.keys(parts.field).length, 0);
    });
  });
});
