import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";
import SummonerView from "./views/SummonerView.vue";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "home",
      component: Home
    },
    {
      path: "/:summonerName",
      name: "summonerView",
      component: SummonerView
    }
  ]
});
