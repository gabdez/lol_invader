import Vue from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import Ionic from "@ionic/vue";

Vue.config.productionTip = false;
Vue.config.ignoredElements = [/^ion-/];

Vue.use(Ionic);

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount("#app");
