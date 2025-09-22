const fs = require('fs');
const path = require('path');

module.exports = app => {
  app.checkFile = () => {
    return {
      timing: fs.existsSync(path.join(__dirname, 'run/agent_timing_11111.json')),
      config: fs.existsSync(path.join(__dirname, 'run/application_config.json')),
    };
  };
};
