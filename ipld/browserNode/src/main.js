import Vue from 'vue'
import App from './App.vue'
import router from './router'

Vue.config.productionTip = false

const node = new window.Ipfs()
node.on('ready', () => {
  Vue.prototype.$ipfs = node;
  new Vue({
    router,
    render: function (h) { return h(App) }
  }).$mount('#app')  
})
node.on('error', console.error);
node.on('stop', error => {
  if (error) return console.error('Node failed to stop cleanly!', error);
  console.log("Node Stopped !");
});