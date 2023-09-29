const bcrypt = require('bcryptjs');

module.exports.hashPassword = (password) => {
  console.log('Hashing password');
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(password, salt);

  return {
    salt,
    hashedPassword,
  };
};
