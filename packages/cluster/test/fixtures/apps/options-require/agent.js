'use strict';

module.exports = () => {
  if (process.env.EGG_TEST_REQUIRE_HOOK === 'true') {
    console.log('### inject additional require hook at agent');
  }
};
