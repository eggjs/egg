import { AgentController, AgentNotFoundError } from '@eggjs/tegg/agent';
import type {
  AgentHandler,
  CreateRunInput,
  RunObject,
  ThreadObject,
  ThreadObjectWithMessages,
  MessageObject,
  MessageDeltaObject,
  AgentStreamMessage,
} from '@eggjs/tegg/agent';
import { ContextHandler } from '@eggjs/tegg/helper';

// Canonical definition in @eggjs/module-common
const EGG_CONTEXT: symbol = Symbol.for('context#eggContext');

// In-memory store for threads and runs
const threads = new Map<
  string,
  { id: string; messages: MessageObject[]; created_at: number; metadata: Record<string, unknown> }
>();
const runs = new Map<
  string,
  { id: string; thread_id?: string; status: string; input: any[]; output?: MessageObject[]; created_at: number }
>();

let threadCounter = 0;
let runCounter = 0;

function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

@AgentController()
export class AgentTestController implements AgentHandler {
  // Required by AgentHandler — noop since all route methods are overridden
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *execRun(_input: CreateRunInput): AsyncGenerator<AgentStreamMessage> {
    // All routes are manually implemented; this is never called.
  }

  async createThread(): Promise<ThreadObject> {
    const threadId = `thread_${++threadCounter}`;
    const now = nowUnix();
    threads.set(threadId, { id: threadId, messages: [], created_at: now, metadata: {} });
    return { id: threadId, object: 'thread', created_at: now, metadata: {} };
  }

  async getThread(threadId: string): Promise<ThreadObjectWithMessages> {
    const thread = threads.get(threadId);
    if (!thread) {
      throw new AgentNotFoundError(`Thread ${threadId} not found`);
    }
    return {
      id: thread.id,
      object: 'thread',
      messages: thread.messages,
      created_at: thread.created_at,
      metadata: thread.metadata,
    };
  }

  async asyncRun(input: CreateRunInput): Promise<RunObject> {
    const runId = `run_${++runCounter}`;
    const now = nowUnix();
    runs.set(runId, {
      id: runId,
      thread_id: input.thread_id,
      status: 'queued',
      input: input.input.messages,
      created_at: now,
    });
    return { id: runId, object: 'thread.run', created_at: now, status: 'queued' };
  }

  async streamRun(input: CreateRunInput): Promise<void> {
    const runtimeCtx = ContextHandler.getContext()!;
    const ctx = runtimeCtx.get(EGG_CONTEXT);

    // Bypass Koa response handling — write SSE directly to the raw response
    ctx.respond = false;
    const res = ctx.res;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const runId = `run_${++runCounter}`;
    const messages = input.input.messages;
    const outputContent = `Streamed ${messages.length} messages`;
    const now = nowUnix();

    const runObj: RunObject = { id: runId, object: 'thread.run', created_at: now, status: 'queued' };
    res.write(`event: thread.run.created\ndata: ${JSON.stringify(runObj)}\n\n`);

    runObj.status = 'in_progress';
    res.write(`event: thread.run.in_progress\ndata: ${JSON.stringify(runObj)}\n\n`);

    const msgId = `msg_${runCounter}`;
    const msgObj: MessageObject = {
      id: msgId,
      object: 'thread.message',
      created_at: now,
      run_id: runId,
      role: 'assistant',
      status: 'in_progress',
      content: [],
    };
    res.write(`event: thread.message.created\ndata: ${JSON.stringify(msgObj)}\n\n`);

    const contentBlock = { type: 'text' as const, text: { value: outputContent, annotations: [] as unknown[] } };
    const delta: MessageDeltaObject = {
      id: msgId,
      object: 'thread.message.delta',
      delta: { content: [contentBlock] },
    };
    res.write(`event: thread.message.delta\ndata: ${JSON.stringify(delta)}\n\n`);

    msgObj.status = 'completed';
    msgObj.content = [contentBlock];
    res.write(`event: thread.message.completed\ndata: ${JSON.stringify(msgObj)}\n\n`);

    const outputMsg: MessageObject = { ...msgObj };
    runObj.status = 'completed';
    runObj.output = [outputMsg];
    res.write(`event: thread.run.completed\ndata: ${JSON.stringify(runObj)}\n\n`);

    res.write('event: done\ndata: [DONE]\n\n');
    res.end();

    runs.set(runId, {
      id: runId,
      status: 'completed',
      input: messages,
      output: [outputMsg],
      created_at: now,
    });
  }

  async syncRun(input: CreateRunInput): Promise<RunObject> {
    const runId = `run_${++runCounter}`;
    const messages = input.input.messages;
    const now = nowUnix();
    const output: MessageObject[] = [
      {
        id: `msg_${runCounter}`,
        object: 'thread.message',
        created_at: now,
        role: 'assistant',
        status: 'completed',
        content: [
          {
            type: 'text',
            text: { value: `Processed ${messages.length} messages`, annotations: [] },
          },
        ],
      },
    ];
    runs.set(runId, {
      id: runId,
      thread_id: input.thread_id,
      status: 'completed',
      input: messages,
      output,
      created_at: now,
    });
    return {
      id: runId,
      object: 'thread.run',
      created_at: now,
      status: 'completed',
      output,
    };
  }

  async getRun(runId: string): Promise<RunObject> {
    const run = runs.get(runId);
    if (!run) {
      throw new AgentNotFoundError(`Run ${runId} not found`);
    }
    return {
      id: run.id,
      object: 'thread.run',
      created_at: run.created_at,
      thread_id: run.thread_id,
      status: run.status as any,
      output: run.output,
    };
  }

  async cancelRun(runId: string): Promise<RunObject> {
    const run = runs.get(runId);
    if (run) {
      run.status = 'cancelled';
    }
    return {
      id: runId,
      object: 'thread.run',
      created_at: run?.created_at ?? nowUnix(),
      status: 'cancelled',
    };
  }
}
