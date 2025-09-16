module.exports = agent => {
  const done = agent.readyCallback();
  setTimeout(() => {
    done(new Error('emit error'));
  }, 500);
};
