import Vue from 'vue'
import App from './App.vue'

// BrowserFS.configure({ fs: "IndexedDB", options: {} }, function (err) {
//   if (err) return console.log(err);
  //window.fs = BrowserFS.BFSRequire("fs");
  window.fs = new LightningFS('fs')
  window.pfs = window.fs.promises;
  git.plugins.set('fs', window.fs);

  new Vue({
    render: function (h) { return h(App) },
  }).$mount('#app');  
// });

Vue.config.productionTip = false;