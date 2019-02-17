<template>
  <ion-app>
    <ion-content>
      <ion-button
        style="display: inline-block"
        class="outlineBtn"
        color="red"
        @click="$router.go(-1)"
      >
        <ion-icon slot="start" name="arrow-back"></ion-icon>back
      </ion-button>
      <ion-list lines="none">
        <ion-item-group>
          <ion-item-divider style="height:20px">
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
              <img v-if="tabUrl.length >0" :src="getChampUrl(p.championId)">
            </ion-thumbnail>
            <ion-avatar>
              <img :src="require('./../assets/sumSpells/'+ p.spell1Id +'.png')">
            </ion-avatar>
            <ion-avatar>
              <img :src="require('./../assets/sumSpells/'+ p.spell2Id +'.png')">
            </ion-avatar>
            <ion-img
              v-if="arrayRankSum.length >0"
              :src="require('./../assets/emblems/Emblem_'+getSumData(p.summonerId).tier+'.png')"
              style="height: 40px;width:40px;"
            ></ion-img>
            <span
              v-if="arrayRankSum.length >0"
              style="padding-right:5px;"
            >{{getSumData(p.summonerId).rank}}</span>
            <ion-label
              style="color:white;"
              :class="{'summoner': p.summonerName == mySummoner.summonerName}"
            >{{p.summonerName}}</ion-label>
            <!-- <ion-note>other things here</ion-note> -->
            <ion-option-button class="optionBtn">details ></ion-option-button>
          </ion-item>
        </ion-item-group>
        <ion-item-group>
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
              <img v-if="tabUrl.length >0" :src="getChampUrl(p.championId)">
            </ion-thumbnail>
            <ion-avatar>
              <img :src="require('./../assets/sumSpells/'+ p.spell1Id +'.png')">
            </ion-avatar>
            <ion-avatar>
              <img :src="require('./../assets/sumSpells/'+ p.spell2Id +'.png')">
            </ion-avatar>
            <ion-img
              v-if="arrayRankSum.length >0"
              :src="require('./../assets/emblems/Emblem_'+getSumData(p.summonerId).tier+'.png')"
              style="height: 40px;width:40px;"
            ></ion-img>
            <span
              v-if="arrayRankSum.length >0"
              style="padding-right:5px;"
            >{{getSumData(p.summonerId).rank}}</span>
            <ion-label
              style="color:white;"
              :class="{'summoner': p.summonerName == 'gabdez'}"
            >{{p.summonerName}}</ion-label>

            <ion-option-button class="optionBtn">details ></ion-option-button>
          </ion-item>
        </ion-item-group>
      </ion-list>
    </ion-content>
  </ion-app>
</template>

<style scoped>
.optionBtn {
  background-color: transparent;
  color: white;
  padding: 0px 0px;
  font-size: 12px;
  cursor: pointer;
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
  mounted: function() {
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
        return this.tabUrl.filter(obj => obj.championId == championId)[0].url;
    },
    async getAllSumRank() {
      var arrayPromises = [];
      var i = {};
      // add all promises url to array
      this.dataGame.participants.forEach(p => {
        let promise = axios.get(
          "https://lolinvader.herokuapp.com/lol/league/v4/positions/by-summoner/" +
            p.summonerId,
          {
            params: { api_key: constant.API_KEY }
          }
        );
        arrayPromises.push(promise);
      });
      var self = this;
      Promise.all(arrayPromises).then(function(values) {
        values.forEach(p => {
          self.arrayRankSum.push(p.data[0]);
        });
      });
    },
    getSumData(summonerId) {
      if (this.arrayRankSum != null)
        return this.arrayRankSum.filter(obj => obj.summonerId == summonerId)[0];
    },
    detailsPlayer(p) {
      console.log(p);
    }
  },
  computed: {
    mySummoner() {
      return this.dataGame.participants.filter(
        d => d.summonerId == this.$route.params.summonerId
      )[0];
    }
  }
};
</script>
