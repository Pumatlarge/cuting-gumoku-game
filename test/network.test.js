const assert = require('node:assert');
const { isValidNetworkMessage } = require('../src/network');

assert.equal(isValidNetworkMessage({ type: 'move', x: 0, y: 14 }), true);
assert.equal(isValidNetworkMessage({ type: 'move', x: -1, y: 14 }), false);
assert.equal(isValidNetworkMessage({ type: 'move', x: 1.5, y: 2 }), false);
assert.equal(isValidNetworkMessage({ type: 'unknown' }), false);
