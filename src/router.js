import Vue from "vue";
import Router from "vue-router";
import Home from "./views/Home.vue";
import SummonerView from "./views/SummonerView.vue";
import GameView from "./views/GameView.vue";
import AllChampsView from "./views/AllChampsView.vue";
import PlayerProfileView from "./views/PlayerProfileView.vue";
import PageNotFound from "./components/NotFound.vue";

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: "/",
      name: "home",
      component: Home
    },
    {
      path: "/:summonerId",
      name: "summonerView",
      component: SummonerView
    },
    {
      path: "/:summonerId/gameView",
      name: "gameView",
      component: GameView,
      props: true
    },
    {
      path: "/playerProfile",
      name: "playerProfileView",
      component: PlayerProfileView
    },
    {
      path: "/allChamps",
      name: "allChampsView",
      component: AllChampsView
    },
    { path: "*", component: PageNotFound }
  ]
});
