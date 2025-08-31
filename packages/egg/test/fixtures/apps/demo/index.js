const egg = require('../../../../');

egg.start().then(app => {
  app.listen(3000);
  console.log('listen 3000');
});
