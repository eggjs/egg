// modify from https://github.com/poppinss/youch/blob/develop/src/Youch/index.js

import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';

import { parse } from 'cookie';
import Mustache from 'mustache';
import stackTrace, { type StackFrame } from 'stack-trace';
import type { OnerrorError } from 'koa-onerror';

import { detectErrorMessage } from './utils.ts';
import type { Context } from 'egg';

const startingSlashRegex = /\\|\//;

export interface FrameSource {
  pre: string[];
  line: string;
  post: string[];
}

export interface Frame extends StackFrame {
  context?: FrameSource;
}

export class ErrorView {
  ctx: Context;
  error: OnerrorError;
  request: Context['request'];
  app: Context['app'];
  assets: Map<string, string>;
  viewTemplate: string;

  codeContext = 5;
  _filterHeaders = [ 'cookie', 'connection' ];

  constructor(ctx: Context, error: OnerrorError, template: string) {
    this.ctx = ctx;
    this.error = error;
    this.request = ctx.request;
    this.app = ctx.app;
    this.assets = new Map();
    this.viewTemplate = template;
  }

  /**
   * get html error page
   *
   * @return {String} html page
   */
  toHTML(): string {
    const stack = this.parseError();
    const data = this.serializeData(stack, (frame, index) => {
      const serializedFrame = this.serializeFrame(frame);
      serializedFrame.classes = this.getFrameClasses(frame, index);
      return serializedFrame;
    });

    return this.compileView(this.viewTemplate, {
      ...data,
      appInfo: this.serializeAppInfo(),
      request: this.serializeRequest(),
    });
  }

  /**
   * compile view
   *
   * @param {String} tpl - template
   * @param {Object} locals - data used by template
   */
  compileView(tpl: string, locals: Record<string, unknown>) {
    return Mustache.render(tpl, locals);
  }

  /**
   * check if the frame is node native file.
   *
   * @param {Frame} frame - current frame
   */
  isNode(frame: Frame) {
    if (frame.isNative()) {
      return true;
    }
    const filename = frame.getFileName() || '';
    return !path.isAbsolute(filename) && filename[0] !== '.';
  }

  /**
   * check if the frame is app modules.
   *
   * @param {Object} frame - current frame
   */
  isApp(frame: Frame) {
    if (this.isNode(frame)) {
      return false;
    }
    const filename = frame.getFileName() || '';
    return !filename.includes('node_modules' + path.sep);
  }

  /**
   * cache file asserts
   *
   * @param {String} key - assert key
   * @param {String} value - assert content
   */
  setAssets(key: string, value: string) {
    this.assets.set(key, value);
  }

  /**
   * get cache file asserts
   *
   * @param {String} key - assert key
   */
  getAssets(key: string) {
    return this.assets.get(key);
  }

  /**
   * get frame source
   *
   * @param {Object} frame - current frame
   */
  getFrameSource(frame: StackFrame): FrameSource {
    const filename = frame.getFileName();
    const lineNumber = frame.getLineNumber();
    let contents = this.getAssets(filename);
    if (!contents) {
      contents = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
      this.setAssets(filename, contents);
    }
    const lines = contents.split(/\r?\n/);

    return {
      pre: lines.slice(Math.max(0, lineNumber - (this.codeContext + 1)), lineNumber - 1),
      line: lines[lineNumber - 1],
      post: lines.slice(lineNumber, lineNumber + this.codeContext),
    };
  }

  /**
   * parse error and return frame stack
   */
  parseError() {
    const stack = stackTrace.parse(this.error);
    return stack.map((frame: Frame) => {
      if (!this.isNode(frame)) {
        frame.context = this.getFrameSource(frame);
      }
      return frame;
    });
  }

  /**
   * get stack context
   *
   * @param {Object} frame - current frame
   */
  getContext(frame: Frame) {
    if (!frame.context) {
      return {};
    }

    return {
      start: frame.getLineNumber() - (frame.context.pre || []).length,
      pre: frame.context.pre.join('\n'),
      line: frame.context.line,
      post: frame.context.post.join('\n'),
    };
  }

  /**
   * get frame classes, let view identify the frame
   *
   * @param {any} frame - current frame
   * @param {any} index - current index
   */
  getFrameClasses(frame: Frame, index: number) {
    const classes: string[] = [];
    if (index === 0) {
      classes.push('active');
    }

    if (!this.isApp(frame)) {
      classes.push('native-frame');
    }

    return classes.join(' ');
  }

  /**
   * serialize frame and return meaningful data
   *
   * @param {Object} frame - current frame
   */
  serializeFrame(frame: Frame) {
    const filename = frame.getFileName();
    const relativeFileName = filename.includes(process.cwd())
      ? filename.replace(process.cwd(), '').replace(startingSlashRegex, '')
      : filename;
    const extname = path.extname(filename).replace('.', '');

    return {
      extname,
      file: relativeFileName,
      method: frame.getFunctionName(),
      line: frame.getLineNumber(),
      column: frame.getColumnNumber(),
      context: this.getContext(frame),
      classes: '',
    };
  }

  /**
   * serialize base data
   *
   * @param {Object} stack - frame stack
   * @param {Function} frameFormatter - frame formatter function
   */
  serializeData(stack: Frame[], frameFormatter: (frame: Frame, index: number) => any) {
    const code = Reflect.get(this.error, 'code') ?? Reflect.get(this.error, 'type');
    let message = detectErrorMessage(this.ctx, this.error);
    if (code) {
      message = `${message} (code: ${code})`;
    }
    return {
      code,
      message,
      name: this.error.name,
      status: this.error.status,
      frames: stack instanceof Array ? stack.filter(frame => frame.getFileName()).map(frameFormatter) : [],
    };
  }

  /**
   * serialize request object
   */
  serializeRequest() {
    const headers: { key: string; value: string | string[] | undefined }[] = [];

    Object.keys(this.request.headers).forEach(key => {
      if (this._filterHeaders.includes(key)) {
        return;
      }
      headers.push({
        key,
        value: this.request.headers[key],
      });
    });

    const parsedCookies = parse(this.request.headers.cookie || '');
    const cookies = Object.keys(parsedCookies).map(key => {
      return { key, value: parsedCookies[key] };
    });

    return {
      url: this.request.url,
      httpVersion: this.request.req.httpVersion,
      method: this.request.method,
      connection: this.request.headers.connection,
      headers,
      cookies,
    };
  }

  /**
   * serialize app info object
   */
  serializeAppInfo() {
    let config = this.app.config;
    if ('dumpConfigToObject' in this.app && typeof this.app.dumpConfigToObject === 'function') {
      config = this.app.dumpConfigToObject().config.config;
    }
    return {
      baseDir: this.app.config.baseDir as string,
      config: util.inspect(config),
    };
  }
}

