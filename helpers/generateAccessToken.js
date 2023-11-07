const cryptoJs = require('crypto-js');
const jwt = require('jsonwebtoken');

const MINUTES_BEFORE_EXPIRY = process.env.ACCESS_EXPIRY || 120; // in minutes

module.exports.generateAccessToken = (organization) => {
  console.log('Generating access token');
  const folderName = organization.orgName.S.replace(/\s/g, '_');

  const payload = { email: organization.email.S, orgId: organization.id.S, folderName };

  console.log('Payload', payload);

  const encryptedPayload = cryptoJs.AES.encrypt(
    JSON.stringify(payload),
    process.env.ACCESS_TOKEN_ENCRYPT_KEY,
  ).toString();

  const expiryDate = new Date();
  expiryDate.setTime(expiryDate.getTime() + MINUTES_BEFORE_EXPIRY * 60 * 1000);

  const accessToken = jwt.sign({ payload: encryptedPayload }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: `${MINUTES_BEFORE_EXPIRY}m`,
    issuer: 'Vault Hill',
  });

  return { accessToken, expiryDate };
};
