const config = require('config');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const notYetInitFn = () => Promise.reject("User collection not yet initialized");
let userColl = {
  firstExample: notYetInitFn,
  save: notYetInitFn
};
const db = require('./db');
const schColl = db.collection("meta-schepes");
schColl.firstExample({ name: "users", _rayId: "0x" }).then(userSchepe => {
  const collName = `${userSchepe.migId}-${userSchepe.name}`;
  userColl = db.collection(collName);
});

class User {
  constructor() { 
    this.tokens = [];
    this.profile = {};
  }
  static findOne(query, cb = (err, existingUser) => {}) {
    return userColl.firstExample(query).then(user => cb(null, user)).catch(ex => {
      if (ex.code == 404) return cb(null, null);
      cb(ex);
    });
  }
  static findById(id, cb = (err, user) => { }) {
    return userColl.firstExample({ [config.db.idField]: id }).then(user => cb(null, user)).catch(ex => {
      if (ex.code == 404) return cb(null, null);
      cb(ex);
    });
  }
  save() {
    return User.hashPassword(this).then(user => userColl.save(user));
  }
  static hashPassword(user) {
    if (!user.password) return Promise.resolve(user);
    return new Promise((resolve, reject) => {
      bcrypt.genSalt(10, (err, salt) => {
        if (err) { return reject(err); }
        bcrypt.hash(user.password, salt, (err, hash) => {
          if (err) { return reject(err); }
          user.password = hash;
          resolve(user);
        });
      });
    });
  }
  comparePassword(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
      cb(err, isMatch);
    });
  }
  gravatar(size) {
    if (!size) {
      size = 200;
    }
    if (!this.email) {
      return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash('md5').update(this.email).digest('hex');
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
  }
};
  
module.exports = User;