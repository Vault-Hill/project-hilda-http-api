const jwt = require('jsonwebtoken');
const crypto = require('crypto-js');

module.exports.authenticate = (token) => {
  try {
    // Step 1: Verify token using jsonwebtoken
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const encrypted = jwt.decode(token);

    console.log('ENCRYPTED: ', encrypted);

    // Step 2: Decrypt the token payload using crypto-js
    const decryptedPayload = crypto.AES.decrypt(
      encrypted.payload,
      process.env.ACCESS_TOKEN_ENCRYPT_KEY,
    ).toString(crypto.enc.Utf8);

    // Step 3: Parse the decrypted payload as JSON
    const payload = JSON.parse(decryptedPayload);

    console.log('PAYLOAD: ', payload);

    return payload;
  } catch (error) {
    console.error('Error during authentication:', error);
    return {};
  }
};
