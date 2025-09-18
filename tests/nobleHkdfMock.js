const { hkdfSync } = require('crypto');

function normalize(input) {
  if (!input) return Buffer.alloc(0);
  if (typeof input === 'string') return Buffer.from(input, 'utf-8');
  if (ArrayBuffer.isView(input)) return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  if (input instanceof ArrayBuffer) return Buffer.from(input);
  return Buffer.from(input);
}

function hkdf(_hash, ikm, salt, info, length) {
  const ikmBuf = normalize(ikm);
  const saltBuf = normalize(salt);
  const infoBuf = normalize(info);
  const out = hkdfSync('sha256', ikmBuf, saltBuf, infoBuf, length);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
}

module.exports = { hkdf };
