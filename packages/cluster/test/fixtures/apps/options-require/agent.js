'use strict';

module.exports = () => {
  if (require.extensions['.ts']) {
    console.log('### inject ts-node/register at agent');
  }
};
