const AdminBro = require('admin-bro');
const AdminBroExpress = require('admin-bro-expressjs');
const ArangoJS = require('arangojs');
const Merge = require('lodash.merge');

const AdminBroArango = require('./admin-bro-arango');
AdminBro.registerAdapter(AdminBroArango);

const express = require('express');
const app = express();

const db = new ArangoJS.Database({ url: "http://localhost:8529" });
db.useDatabase("default");

const contentParent = {
  name: 'content',
  icon: 'Accessibility',
};

const CustomDateComponent = { components: { edit: AdminBro.bundle('./components/test-component') } };

const schColl = db.collection("meta-schepes");
schColl.all().then(cursor => cursor.all()).then(docs => {
  // Each of these docs will be sent as `model` param to the resource constructor
  const resources = docs.map(schepe => {
    // add database accessor.
    schepe.$db = db;

    // add custom overloads for few properties, if any
    const properties = {};
    for (let [fld, fldDefn] of Object.entries(schepe.schema)) { 
      if (fldDefn.type == "dateTime")
        properties[fld] = Merge({}, properties[fld], CustomDateComponent);
    }

    return {
      resource: schepe,
      // options: {
      //   parent: contentParent,
      //   properties
      // }
    };
  });

  const adminBro = new AdminBro({
    //databases: [db],
    resources,
    rootPath: '/admin',
    branding: {
      companyName: 'Workplace c.o.',
      softwareBrothers: false
    },
    pages: {
      customPage: {
        label: "Custom page",
        handler: async (request, response, context) => {
          return {
            text: 'I am fetched from the backend',
          }
        },
        component: AdminBro.bundle('./components/some-stats'),
      },
      anotherPage: {
        label: "TypeScript page",
        component: AdminBro.bundle('./components/test-component'),
      },
    }    
    //assets: { globalsFromCDN: false }
  });
  const router = AdminBroExpress.buildRouter(adminBro);

  app.use(adminBro.options.rootPath, router);
  app.listen(8080, () => console.log('AdminBro is under localhost:8080/admin'));  
});

// db.close();