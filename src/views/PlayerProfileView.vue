<template>
  <div class="playerProfileView">
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
        <PlayerInfo v-if="summonerData" :data="summonerData"/>
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
import axios from "axios";

export default {
  name: "playerProfileView",
  components: { PlayerInfo, Loading },
  props: {},
  data: function() {
    return {
      summonerData: null
    };
  },
  mounted() {
    this.request();
  },
  methods: {
    async request() {
      console.log("debut requete.");
      axios
        .get(
          "https://lolinvader.herokuapp.com/lol/league/v4/positions/by-summoner/" +
            this.$store.state.playerProfile[0].summonerId
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
    }
  },
  computed: {
    playerProfile() {
      return this.$store.state.playerProfile;
    }
  }
};
</script>
