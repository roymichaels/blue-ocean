const { createHash } = require('crypto');

function toBuffer(input) {
  if (input instanceof Uint8Array || Buffer.isBuffer(input)) {
    return Buffer.from(input);
  }
  if (Array.isArray(input)) {
    return Buffer.from(input);
  }
  if (typeof input === 'string') {
    return Buffer.from(input);
  }
  if (input && typeof input === 'object' && 'buffer' in input) {
    return Buffer.from(input.buffer, input.byteOffset ?? 0, input.byteLength ?? input.buffer.byteLength);
  }
  return Buffer.from([]);
}

function digest(name, data) {
  const hash = createHash(name);
  if (Array.isArray(data)) {
    data.forEach((chunk) => hash.update(toBuffer(chunk)));
  } else {
    hash.update(toBuffer(data));
  }
  return Uint8Array.from(hash.digest());
}

function makeHash(name) {
  const fn = (data) => digest(name, data);
  fn.create = () => {
    const hash = createHash(name);
    return {
      update(chunk) {
        hash.update(toBuffer(chunk));
        return this;
      },
      digest() {
        return Uint8Array.from(hash.digest());
      },
    };
  };
  return fn;
}

const sha256 = makeHash('sha256');

module.exports = { sha256 };
