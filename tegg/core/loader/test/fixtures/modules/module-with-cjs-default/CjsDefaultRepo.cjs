const { Prototype } = require('@eggjs/core-decorator');

class CjsDefaultRepo {}

Prototype()(CjsDefaultRepo);

module.exports = CjsDefaultRepo;
