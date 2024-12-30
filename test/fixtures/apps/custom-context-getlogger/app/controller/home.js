module.exports = async function () {
  const logger = this.getLogger('foo');
  logger.info('hello');
  this.body = 'work, logger: ' + (logger ? 'exists' : 'not exists');
};
