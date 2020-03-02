const NeDB = require('nedb');
const path = require('path');
const { hashPassword } = require('@feathersjs/authentication-local').hooks;

module.exports = function (app) {
  const dbPath = app.get('nedb');
  const Model = new NeDB({
    filename: path.join(dbPath, 'users.db'),
    autoload: true
  });

  Model.ensureIndex({ fieldName: 'email', unique: true });

  const adminConfig = app.settings.authentication.admin || {};
  // // create the admin user as per the config
  // Model.update({ email: adminConfig.email }, adminConfig, { upsert: true }, (err, _numReplaced, _upsert) => {
  //   if (err) throw err;
  //   console.log(`Updated the admin record [${upsert._id || upsert.id}]: ${adminConfig.email}`);
  // });

  return Model;
};
