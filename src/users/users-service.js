const bcrypt = require('bcryptjs');
const xss = require('xss');

const REGEX_UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/;

const UsersService = {
  hasUserWithemail(db, email) {
    return db('users')
      .where({ email })
      .first()
      .then(user => !!user);
  },
  insertUser(db, newUser) {
    return db
      .insert(newUser)
      .into('users')
      .returning('*')
      .then(([user]) => user);
  },
  updateUser(db, id, updates) {
    return db
      .update(updates)
      .from('users')
      .where('id', id)
      .returning('*')
      .then(([user]) => user);
  },
  deleteUser(db, id) {
    return db
      .from('users')
      .where('id', id)
      .del();
  },
  validatePassword(password) {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (password.length > 72) {
      return 'Password be less than 72 characters';
    }
    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty spaces';
    }
    if (!REGEX_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return 'Password must contain one upper case, lower case, number and special character';
    }
    return null;
  },
  hashPassword(password) {
    return bcrypt.hash(password, 12);
  },
  serializeUser(user) {
    return {
      id: user.id,
      full_name: xss(user.full_name),
      email: xss(user.email),
      nickname: xss(user.nick_name),
      date_created: new Date(user.date_created),
      date_modified: user.date_modified ? new Date(user.date_modified) : null
    };
  },
};

module.exports = UsersService;
