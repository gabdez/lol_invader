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
  </div>
</template>

<script>
/* eslint-disable */
export default {
  name: "PlayerInfo",
  props: ["data"],
  components: {},
  data: function() {
    return {};
  },
  mounted: function() {},
  methods: {}
};
</script>

<style>
.contentWallpaper {
  --background: url("./../assets/wall2.jpg") no-repeat 100% 100% !important;
}
ion-toolbar {
  position: absolute;
  --background: rgba(255, 255, 255, 0.5);
}
</style>
