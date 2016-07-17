'use strict';

module.exports = agent => {
  const done = agent.readyCallback('custom-agent-ready')
  const ins = agent.instrument('http', `/hello`);
  setTimeout(() => {
    ins.end();
    done();
  }, 500);
}
