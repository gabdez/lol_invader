<template>
  <ion-app>
    <ion-content padding class="contentWallpaper">
      <ion-card>
        <ion-card-header>
          <ion-img :src="require('./../assets/logoLol1.jpeg')"></ion-img>
        </ion-card-header>
        <hr>
        <ion-card-content>
          <ion-grid>
            <div class="item">
              <ion-label position="stacked">summoner Name</ion-label>
              <ion-input autofocus @ionChange="changeUsername($event)"></ion-input>
            </div>
            <div class="item">
              <ion-label position="stacked">Region</ion-label>
              <ion-input value="EUW1" readonly></ion-input>
            </div>
            <span v-if="check" class="warning">This summoner name doesn't exist!</span>
            <ion-row justify-content-center>
              <ion-button
                color="primary"
                @click="startInvade"
                :disabled="summonerName == ''"
              >Start invade</ion-button>
            </ion-row>
            <!-- <ion-row justify-content-center>
              <ion-button color="primary" @click="goToAllChamps">see all champs</ion-button>
            </ion-row>-->
          </ion-grid>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-app>
</template>

<script>
/* eslint-disable */
import axios from "axios";
import constant from "./../constant.js";
export default {
  name: "Login",
  props: {},
  data: function() {
    return {
      summonerName: "",
      check: false
    };
  },
  methods: {
    changeUsername($event) {
      this.summonerName = $event.target.value;
    },
    startInvade() {
      var self = this;
      console.log();
      this.checkSummonerName()
        .then(function(result) {
          console.log("result login :");
          console.log(result.data);
          self.$router.push({
            name: "summonerView",
            params: { summonerId: result.data.id }
          });
        })
        .catch(function(error) {
          console.log(error);
          self.check = true;
        });
    },
    async checkSummonerName() {
      let json = await axios.get(
        "https://lolinvader.herokuapp.com/lol/summoner/v4/summoners/by-name/" +
          this.summonerName
      );
      return json;
    },
    goToAllChamps() {
      this.$router.push({ name: "allChampsView" });
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.warning {
  color: red;
}
hr {
  border: 1px solid white !important;
  height: 0px !important;
  width: 90% !important;
  display: block !important;
}
.item {
  background-color: rgba(255, 255, 255, 0.2);
}
.item > ion-label {
  color: #3880ff;
}
.item > ion-input {
  color: white;
}
ion-button {
  margin-top: 14px;
}
</style>
