import { createWorkerThreadIO } from '../../src/worker_protocol/worker-thread.ts';

const io = createWorkerThreadIO();

io.on('message', (message) => {
  if (message === 'kill') {
    io.kill();
  }
});

io.gracefulExit({
  async beforeExit() {
    await Promise.resolve();
    io.send({ action: 'closed' });
  },
});

io.send({ action: 'ready' });
