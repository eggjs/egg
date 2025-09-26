export const schedule = {
  type: 'worker',
  interval: '4s',
};

export async function task(ctx) {
  ctx.logger.info('interval');
}
