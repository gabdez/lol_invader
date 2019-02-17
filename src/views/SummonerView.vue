<template>
  <div class="summonerView">
    <ion-app>
      <ion-header>
        <ion-toolbar mode="ios">
          <ion-button
            style="display: inline-block"
            class="outlineBtn"
            color="red"
            @click="$router.push('/')"
          >
            <ion-icon slot="start" name="arrow-back"></ion-icon>back
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content padding class="contentWallpaper">
        <PlayerInfo v-if="summonerData" :data="summonerData"/>
        <NotFound
          @returnLogin="returnLogin"
          v-else-if="endRequest==true && summonerData == null"
        >this summoner have no Rank for the moment</NotFound>
        <Loading v-else></Loading>
      </ion-content>
    </ion-app>
  </div>
</template>

<script>
// @ is an alias to /src
/* eslint-disable */
import PlayerInfo from "@/components/PlayerInfo.vue";
import Loading from "@/components/Loading.vue";
import NotFound from "@/components/NotFound.vue";
import axios from "axios";
import constant from "./../constant.js";

export default {
  name: "summonerView",
  components: {
    PlayerInfo,
    NotFound,
    Loading
  },
  data: function() {
    return {
      summonerId: null,
      summonerData: null,
      endRequest: false
    };
  },
  mounted: function() {
    console.log("async");
    this.summonerId = this.$route.params.summonerId;
    this.request();
  },
  destroy: function() {
    console.log("destroy");
  },
  methods: {
    async request() {
      console.log("debut requete.");
      axios
        .get(
          "https://lolinvader.herokuapp.com/lol/league/v4/positions/by-summoner/" +
            this.summonerId,
          {
            params: { api_key: constant.API_KEY }
          }
        )
        .then(response => {
          console.log("requete succés fin.");
          console.log(response.data);
          this.summonerData = response.data[0];
          console.log(this.summonerData);
          this.endRequest = true;
        })
        .catch(error => {
          console.log(error);
        });
    },
    returnLogin() {
      this.$router.push("/");
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
  --background: rgba(255, 255, 255, 0);
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