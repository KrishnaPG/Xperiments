const AdminBro = require('admin-bro');
const AdminBroExpress = require('admin-bro-expressjs');

const AdminBroArango = require('./admin-bro-arango');
AdminBro.registerAdapter(AdminBroArango);

const express = require('express');
const app = express();

const ArangoJS = require('arangojs');
const db = new ArangoJS.Database({ url: "http://localhost:8529" });
db.useDatabase("default");

const schColl = db.collection("meta-schepes");
schColl.all().then(cursor => cursor.all()).then(docs => {
  // add database accessor. Each of these docs will be sent 
  // as `model` param to the resource constructor
  docs.forEach(doc => doc.$db = db);

  const adminBro = new AdminBro({
    //databases: [db],
    resources: docs,
    rootPath: '/admin',
    branding: {
      companyName: 'Amazing c.o.',
      softwareBrothers: false
    },
    //assets: { globalsFromCDN: false }
  });
  const router = AdminBroExpress.buildRouter(adminBro);

  app.use(adminBro.options.rootPath, router);
  app.listen(8080, () => console.log('AdminBro is under localhost:8080/admin'));  
});

// db.close();