// add encrypt and decrypt for Keygrip
// patch from https://github.com/crypto-utils/keygrip

/* jshint ignore:start */
/* eslint-disable */

var debug = require('debug')('egg:cookie:keygrip');
var crypto = require('crypto');
var constantTimeCompare = require('scmp')

module.exports = Keygrip

function Keygrip(keys) {
  if (arguments.length > 1) {
    console.warn('as of v2, keygrip() only accepts a single argument.')
    console.warn('set keygrip().hash= instead.')
    console.warn('keygrip() also now only supports buffers.')
  }

  if (!Array.isArray(keys) || !keys.length) throw new Error("Keys must be provided.")
  if (!(this instanceof Keygrip)) return new Keygrip(keys)

  this.keys = keys
}

/**
 * Allow setting `keygrip.hash = 'sha1'`
 * or `keygrip.cipher = 'aes256'`
 * with validation instead of always doing `keygrip([], alg, enc)`.
 * This also allows for easier defaults.
 */

Keygrip.prototype = {
  constructor: Keygrip,

  get hash() {
    return this._hash
  },

  set hash(val) {
    // if (!util.supportedHash(val))
      // throw new Error('unsupported hash algorithm: ' + val)
    this._hash = val
  },

  get cipher() {
    return this._cipher
  },

  set cipher(val) {
    // if (!util.supportedCipher(val))
      // throw new Error('unsupported cipher: ' + val)
    this._cipher = val
  },

  // defaults
  _hash: 'sha256',
  _cipher: 'aes-256-cbc',
}

// encrypt a message
Keygrip.prototype.encrypt = function encrypt(data, iv, key, encoding) {
  key = key || this.keys[0]

  var cipher = iv
    ? crypto.createCipheriv(this.cipher, key, iv)
    : crypto.createCipher(this.cipher, key)

  return crypt(cipher, data, encoding)
}

// decrypt a single message
// returns false on bad decrypts
Keygrip.prototype.decrypt = function decrypt(data, iv, key, encoding) {
  if (!key) {
    // decrypt every key
    var keys = this.keys
    for (var i = 0, l = keys.length; i < l; i++) {
      var message = this.decrypt(data, iv, keys[i], encoding)
      if (message !== false) return [message, i]
    }

    return false
  }

  try {
    var cipher = iv
      ? crypto.createDecipheriv(this.cipher, key, iv)
      : crypto.createDecipher(this.cipher, key)
    return crypt(cipher, data, encoding)
  } catch (err) {
    debug(err.stack)
    return false
  }
}

// message signing
Keygrip.prototype.sign = function sign(data, key) {
  // default to the first key
  key = key || this.keys[0]

  return crypto
    .createHmac(this.hash, key)
    .update(data)
    .digest('base64')
    .replace(/\/|\+|=/g, function(x) {
      return ({ "/": "_", "+": "-", "=": "" })[x]
    })
}

Keygrip.prototype.verify = function verify(data, digest) {
  return this.indexOf(data, digest) > -1
}

Keygrip.prototype.index =
Keygrip.prototype.indexOf = function Keygrip$_index(data, digest) {
  var keys = this.keys
  for (var i = 0, l = keys.length; i < l; i++) {
    if (constantTimeCompare(digest, this.sign(data, keys[i]))) return i
  }

  return -1
}

Keygrip.encrypt =
Keygrip.decrypt =
Keygrip.sign =
Keygrip.verify =
Keygrip.index =
Keygrip.indexOf = function() {
  throw new Error("Usage: require('keygrip')(<array-of-keys>)")
}

function crypt(cipher, data, encoding) {
  var text = cipher.update(data, encoding || 'utf8');
  var pad  = cipher.final();

  if (typeof text === 'string') {
    // cipher output binary strings (Node.js <= 0.8)
    text = new Buffer(text, 'binary');
    pad  = new Buffer(pad, 'binary');
  }

  return Buffer.concat([text, pad]);
}

/* jshint ignore:end */
