<template>
  <div class="gameView">
    <ion-app>
      <ion-header>
        <ion-toolbar mode="ios">
          <ion-button
            style="display: inline-block"
            class="outlineBtn"
            color="red"
            @click="$router.go(-1)"
          >
            <ion-icon slot="start" name="arrow-back"></ion-icon>back
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content padding class="contentWallpaper">
        <listPlayersGame v-if="dataGame != null" :dataGame="dataGame"></listPlayersGame>
        <notFound v-else-if="check == true">
          <span style="color:red;">No active game for the moment</span>
        </notFound>
        <loading v-else></loading>
      </ion-content>
    </ion-app>
  </div>
</template>

<script>
// @ is an alias to /src
/* eslint-disable */

//import component
import listPlayersGame from "@/components/listPlayersGame.vue";
import loading from "@/components/Loading.vue";
import notFound from "@/components/NotFound.vue";

import axios from "axios";
export default {
  name: "gameView",
  components: { listPlayersGame, loading, notFound },
  props: {},
  data: function() {
    return {
      dataGame: null,
      check: false
    };
  },
  mounted: function() {
    this.searchActiveGame();
  },
  methods: {
    searchActiveGame() {
      var self = this;
      this.checkActiveGameExist()
        .then(function(result) {
          console.log("result active game:");
          self.dataGame = result.data;
          console.log(result);
        })
        .catch(function(error) {
          console.log("any active game");
          console.log(error);
          self.check = true;
        });
    },
    async checkActiveGameExist() {
      console.log("debut request active game");
      /* let json = await axios.get(
        "https://lolinvader.herokuapp.com/lol/spectator/v4/active-games/by-summoner/" +
          this.$route.params.summonerId
      ); */
      let json = await axios.get("/game-exemple.json");
      return json;
    }
  }
};
</script>
