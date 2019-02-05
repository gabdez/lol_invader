<template>
  <ion-app>
    <!-- 
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title text-center>Lol Invader</ion-title>
      </ion-toolbar>
    </ion-header>-->
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
            <ion-row justify-content-center>
              <ion-button
                color="primary"
                @click="startInvade"
                :disabled="summonerName == ''"
              >Start invade</ion-button>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-app>
</template>

<script>
/* eslint-disable */

export default {
  name: "Login",
  props: {},
  data: function() {
    return {
      summonerName: ""
    };
  },
  methods: {
    changeUsername($event) {
      this.summonerName = $event.target.value;
    },
    startInvade() {
      this.$router.push({
        name: "summonerView",
        params: { summonerName: this.summonerName }
      });
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
hr {
  border: 1px solid white !important;
  height: 0px !important;
  width: 90% !important;
  display: block !important;
}
.item{
  background-color: rgba(255, 255, 255, 0.2);
}
.item > ion-label{
  color: #3880ff;
}
 .item > ion-input{
  color: white;
}
ion-button{
  margin-top: 14px;
}
.contentWallpaper {
  --background: url("./../assets/wall2.jpg") no-repeat 100% 100% !important;
}
</style>
