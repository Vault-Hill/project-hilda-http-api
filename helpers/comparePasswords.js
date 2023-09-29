const bcrypt = require('bcryptjs');

module.exports.comparePasswords = (plainPassword, hashedPassword, salt) => {

  console.log('Comparing passwords');
  console.log(plainPassword, hashedPassword, salt)

  const newHashedPassword = bcrypt.hashSync(plainPassword, salt);

  return hashedPassword === newHashedPassword;
};
