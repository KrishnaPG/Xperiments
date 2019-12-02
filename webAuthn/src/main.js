import App from './App.vue'
import toBuffer from 'typedarray-to-buffer';

Vue.config.productionTip = false;

nacl_factory.instantiate(sodium => {
  // make it accessible in every Vue component
  Vue.prototype.$Sodium = sodium;
  Vue.prototype.$toBuffer = toBuffer;

  // start the vue instance
  new Vue({
    render: function (h) { return h(App) },
  }).$mount('#app');
});