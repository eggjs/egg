module.exports = class Boot {
  constructor(app) {
    this.app = app;
  }

  async willReady() {
    const app = this.app;
    app.received = [];
    app.messenger.on('action', data => {
      app.received.push(data);
      console.error('app.js received action data: %o', data);
    });

    app.messenger.on('app-action', () => {
      app.recievedAppAction = true;
    });

    app.messenger.on('broadcast-action', () => {
      app.recievedBroadcastAction = true;
    });

    app.messenger.on('agent-recieved-broadcast-action', () => {
      app.recievedAgentRecievedAction = true;
    });

    app.messenger.sendToAgent('action', 'send data to agent when app starting');

    // app.ready(() => {
    //   app.messenger.sendToAgent('action', 'send data when app started');
    //   app.messenger.sendRandom('action', 'send data to a random agent');
    //   app.messenger.broadcast('broadcast-action', 'broadcast action');
    //   app.messenger.sendToApp('app-action', 'send action to app');
    // });
    // app.messenger.on('egg-ready', data => {
    //   app.eggReady = true;
    //   app.eggReadyData = data;
    // });
  }

  async didReady() {
    const app = this.app;
    app.eggReady = true;
    app.messenger.sendToAgent('action', 'send data to agent when app started');
  }

  async serverDidReady() {
    const app = this.app;
    // only can send message to agent when server started
    app.messenger.sendRandom('action', 'send data to a random agent');
    app.messenger.broadcast('broadcast-action', 'broadcast action');
    app.messenger.sendToApp('app-action', 'send action to app');
    app.messenger.sendToApp('action', 'send action to all app');
    app.serverReady = true;
  }
};
