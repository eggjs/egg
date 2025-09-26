exports.schedule = {
  type: 'worker',
  interval: 2000,
};

exports.task = async function () {
  throw new Error('interval error');
};
