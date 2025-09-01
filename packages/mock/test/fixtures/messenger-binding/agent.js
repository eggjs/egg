module.exports = class Boot {
  constructor(agent) {
    this.agent = agent;
  }

  async willReady() {
    const agent = this.agent;
    agent.received = [];
    agent.messenger.on('action', data => {
      agent.received.push(data);
      console.error('agent.js received action data: %o', data);
    });

    agent.messenger.on('broadcast-action', () => {
      agent.recievedBroadcastAction = true;
      agent.messenger.sendToApp('agent-recieved-broadcast-action');
    });

    agent.messenger.sendToApp('action', 'send data to app when agent starting');
  }

  async didReady() {
    const agent = this.agent;
    agent.eggReady = true;
    agent.messenger.sendToApp('action', 'send data to app when agent started');
  }

  async serverDidReady() {
    console.error('agent.js serverDidReady start');
    const agent = this.agent;
    // only can send message to app when server started
    agent.messenger.sendToApp('action', 'send data to app when server started');
    agent.messenger.sendRandom('action', 'send data to a random app');
    agent.serverReady = true;
    console.error('agent.js serverDidReady end');
  }
};
