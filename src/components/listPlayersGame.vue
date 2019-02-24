<template>
  <div class="listPlayersGame">
    <ion-list lines="none">
      <ion-item-group v-if="dataGame.participants">
        <ion-item-divider style="height:20px; background-color: transparent">
          <ion-label>ally team</ion-label>
        </ion-item-divider>
        <ion-item
          v-for="p in dataGame.participants.filter(participant => participant.teamId === mySummoner.teamId)"
          :key="p.summonerName"
          style="border-bottom: solid 1px grey;"
          class="ally"
          @click="detailsPlayer(p)"
        >
          <ion-thumbnail>
            <img v-if="tabUrl.length >0" :src="getChampUrl(p.championId).url">
          </ion-thumbnail>
          <ion-avatar>
            <img :src="require('./../assets/sumSpells/'+ p.spell1Id +'.png')">
          </ion-avatar>
          <ion-avatar>
            <img :src="require('./../assets/sumSpells/'+ p.spell2Id +'.png')">
          </ion-avatar>
          <ion-img
            v-if="haveRank(p.summonerId)"
            :src="require('./../assets/emblems/Emblem_'+getSumData(p.summonerId).tier+'.png')"
            style="height: 40px;width:40px;"
          ></ion-img>
          <span
            v-if="haveRank(p.summonerId)"
            style="padding-right:5px;"
          >{{getSumData(p.summonerId).rank}}</span>
          <ion-label
            style="color:white;"
            :class="{'summoner': p.summonerName == mySummoner.summonerName}"
          >{{p.summonerName}}</ion-label>
          <!-- <ion-note>other things here</ion-note> -->
          <ion-icon name="arrow-forward" mode="ios" style="color:white; font-size:1em"></ion-icon>
        </ion-item>
      </ion-item-group>
      <ion-item-group v-if="dataGame.participants">
        <ion-item-divider>
          <ion-label>enemy team</ion-label>
        </ion-item-divider>
        <ion-item
          align-items-center
          v-for="p in dataGame.participants.filter(part => part.teamId != mySummoner.teamId)"
          :key="p.summonerName"
          style="border-bottom: solid 1px grey"
          class="enemy"
          @click="detailsPlayer(p)"
        >
          <ion-thumbnail>
            <img v-if="tabUrl.length >0" :src="getChampUrl(p.championId).url">
          </ion-thumbnail>
          <ion-avatar>
            <img :src="require('./../assets/sumSpells/'+ p.spell1Id +'.png')">
          </ion-avatar>
          <ion-avatar>
            <img :src="require('./../assets/sumSpells/'+ p.spell2Id +'.png')">
          </ion-avatar>
          <ion-img
            v-if="haveRank(p.summonerId)"
            :src="require('./../assets/emblems/Emblem_'+getSumData(p.summonerId).tier+'.png')"
            style="height: 40px;width:40px;"
          ></ion-img>
          <span
            v-if="haveRank(p.summonerId)"
            style="padding-right:5px;"
          >{{getSumData(p.summonerId).rank}}</span>
          <ion-label
            style="color:white;"
            :class="{'summoner': p.summonerName == 'gabdez'}"
          >{{p.summonerName}}</ion-label>

          <ion-icon name="arrow-forward" mode="ios" style="color:white; font-size:1em"></ion-icon>
        </ion-item>
      </ion-item-group>
    </ion-list>
  </div>
</template>

<style scoped>
.listPlayersGame {
  padding-top: 35px;
}
/* ion-label {
  padding-top: 5% !important;
} */
ion-list {
  margin: 0;
}
.enemy {
  --background: rgba(240, 65, 65, 0.8);
}
.ally {
  --background: rgba(16, 220, 96, 0.8);
}
.summoner {
  color: blue !important;
}
ion-thumbnail {
  height: 56px;
  width: 56px;
}
ion-item-divider {
  background-color: #f2f2f2;
  color: black;
}
</style>



<script>
// @ is an alias to /src
/* eslint-disable */
import spells from "./../spells.js";
import axios from "axios";
import constant from "./../constant.js";

export default {
  name: "listPlayersGame",
  components: {},
  props: ["dataGame"],
  data: function() {
    return {
      allChampsObj: null,
      tabUrl: [],
      arrayRankSum: []
    };
  },
  created() {
    console.log("created");
    this.summonerId = this.$route.params.summonerId;
    let self = this;
    axios
      .get(
        "http://ddragon.leagueoflegends.com/cdn/9.3.1/data/en_US/champion.json"
      )
      .then(response => {
        self.allChampsObj = response.data.data;
        this.getAllChampsUrl();
        this.getAllSumRank();
      })
      .catch(error => {
        console.log(error);
      });
  },
  mounted: function() {
    console.log("mounted");
  },
  methods: {
    getAllChampsUrl() {
      var tabUrl = []; //tab with champion id and url
      var tabIndex; // tab of all champion id of the game
      if (this.allChampsObj != null) {
        tabIndex = this.dataGame.participants.map(p => p.championId);

        // now loop on object of all champs and find name of champ
        Object.entries(this.allChampsObj).forEach(champ => {
          //si le championId est présent dans le tabIndex
          let i = tabIndex.indexOf(parseInt(champ[1].key));
          if (i != -1) {
            tabUrl.push({
              championId: champ[1].key,
              championKey: champ[1].id,
              url:
                "http://ddragon.leagueoflegends.com/cdn/9.3.1/img/champion/" +
                champ[1].id +
                ".png"
            });
          }
        });
      }
      this.tabUrl = tabUrl;
      return tabUrl;
    },
    getChampUrl(championId) {
      if (this.tabUrl != null)
        return this.tabUrl.filter(obj => obj.championId == championId)[0];
    },
    async getAllSumRank() {
      var arrayPromises = [];
      var i = {};
      // add all promises url to array
      this.dataGame.participants.forEach(p => {
        let promise = axios.get(
          "https://lolinvader.herokuapp.com/lol/league/v4/positions/by-summoner/" +
            p.summonerId
        );
        arrayPromises.push(promise);
      });
      var self = this;
      console.log(arrayPromises);
      Promise.all(arrayPromises).then(function(values) {
        values.forEach(p => {
          if (p.data[0]) self.arrayRankSum.push(p.data[0]);
        });
      });
    },
    getSumData(summonerId) {
      if (this.arrayRankSum != null)
        return this.arrayRankSum.filter(obj => obj.summonerId == summonerId)[0];
    },
    haveRank(summonerId) {
      console.log();
      if (this.arrayRankSum != null)
        return this.arrayRankSum.filter(
          obj => obj.summonerId == summonerId
        )[0] != undefined
          ? true
          : false;
    },
    detailsPlayer(p) {
      var obj = [];
      obj.push(p);
      obj.push(this.getChampUrl(p.championId));
      this.$store.commit("updatePlayerProfile", obj);
      console.log(this.$store.state.playerProfile);
      this.$router.push({
        name: "playerProfileView"
      });
    }
  },
  computed: {
    mySummoner() {
      return this.dataGame.participants.filter(
        d => d.summonerId == this.summonerId
      )[0];
    }
  }
};
</script>
