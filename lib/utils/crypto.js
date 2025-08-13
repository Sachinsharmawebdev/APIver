const crypto = require('crypto');
const zlib = require('zlib');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey() {
  const key = process.env.APIVER_KEY;
  if (!key) {
    console.error('APIVER_KEY env var is required (32+ chars).');
    process.exit(1);
  }
  // create 32 byte key from the provided secret
  return crypto.createHash('sha256').update(key).digest();
}

function encryptAndCompress(buffer) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const compressed = zlib.gzipSync(buffer);
  const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);
  // store IV at beginning
  return Buffer.concat([iv, encrypted]);
}

function decryptAndDecompress(buffer) {
  const key = getKey();
  const iv = buffer.slice(0, IV_LENGTH);
  const encrypted = buffer.slice(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decompressed = zlib.gunzipSync(Buffer.concat([decipher.update(encrypted), decipher.final()]));
  return decompressed;
}

module.exports = { encryptAndCompress, decryptAndDecompress };