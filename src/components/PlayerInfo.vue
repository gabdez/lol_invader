<template>
  <div>
    <ion-card>
      <ion-card-content>
        <ion-img :src="require('./../assets/emblems/Emblem_'+data.tier+'.png')"></ion-img>
      </ion-card-content>
      <ion-card-header>
        <ion-card-title>{{data.summonerName}}</ion-card-title>
        <ion-card-subtitle style="color:white">
          {{data.tier}} {{data.rank}} ({{data.leaguePoints}} LP)
          <br>
          {{data.leagueName}}
        </ion-card-subtitle>
        <ion-card-content style="color:white">
          win/loss: {{data.wins}}-{{data.losses}}
          <ion-icon v-if="data.hotStreak == true" class="red" name="flame"></ion-icon>
        </ion-card-content>
      </ion-card-header>
    </ion-card>
    <ion-row justify-content-center>
      <span v-if="check" class="warning">any active game at the moment!</span>
      <ion-button @click="searchActiveGame">Search active game</ion-button>
    </ion-row>
  </div>
</template>

<script>
/* eslint-disable */
import axios from "axios";
import constant from "./../constant.js";
export default {
  name: "PlayerInfo",
  props: ["data"],
  components: {},
  data: function() {
    return {
      check: false
    };
  },
  mounted: function() {},
  methods: {
    searchActiveGame() {
      var self = this;
      console.log();
      this.checkActiveGameExist()
        .then(function(result) {
          console.log("result active game:");
          self.$router.push({
            name: "gameView",
            params: { summonerId: self.data.summonerId, data: result.data }
          });
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
      /*       let json = await axios.get(
        "https://cors-anywhere.herokuapp.com/https://euw1.api.riotgames.com/lol/spectator/v4/active-games/by-summoner/" +
          this.data.summonerId,
        { params: { api_key: constant.API_KEY } }
      ); */
      let json = await axios.get("/game-exemple.json");
      return json;
    }
  }
};
</script>

<style>
.contentWallpaper {
  --background: url("./../assets/wall2.jpg") no-repeat 100% 100% !important;
}
.warning {
  color: red;
}
ion-card {
  background-color: rgba(255, 255, 255, 0.3) !important;
  margin-top: 20% !important;
}
ion-toolbar {
  position: absolute;
  --background: rgba(255, 255, 255, 0.5);
}
ion-icon.red {
  color: red !important;
}
.outlineBtn {
  background-color: transparent;
  color: #3880ff;
  padding: 0px 0px;
  font-size: 11px;
  cursor: pointer;
}
</style>
