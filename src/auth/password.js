const { randomBytes, scryptSync, timingSafeEqual } = require('crypto');

function hashPassword(password) {
  const normalized = String(password || '');
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(normalized, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, passwordHash) {
  if (!passwordHash || !passwordHash.includes(':')) return false;
  const [salt, savedHashHex] = passwordHash.split(':');
  const derived = scryptSync(String(password || ''), salt, 64);
  const savedHash = Buffer.from(savedHashHex, 'hex');
  if (savedHash.length !== derived.length) return false;
  return timingSafeEqual(savedHash, derived);
}

module.exports = {
  hashPassword,
  verifyPassword
};
