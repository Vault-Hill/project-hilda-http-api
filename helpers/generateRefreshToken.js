const cryptoJs = require('crypto-js');
const jwt = require('jsonwebtoken');

const DAYS_BEFORE_EXPIRY = 7;

module.exports.generateRefreshToken = (organization) => {
  console.log('Generating refresh token');
  const payload = { email: organization.email.S, orgId: organization.id.S };

  const encryptedPayload = cryptoJs.AES.encrypt(
    JSON.stringify(payload),
    process.env.REFRESH_TOKEN_ENCRYPT_KEY,
  ).toString();

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + DAYS_BEFORE_EXPIRY);
  const expirySeconds = Math.floor(expiryDate.getTime() / 1000);

  const refreshToken = jwt.sign({ payload: encryptedPayload }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: `${DAYS_BEFORE_EXPIRY}d`,
    issuer: 'Vault Hill',
  });

  return { refreshToken, expirySeconds };
};
