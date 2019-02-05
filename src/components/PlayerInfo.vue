<template>
  <div>
    ListPlayersGame of {{summonerName}}
    <span>{{check}}</span>
  </div>
</template>

<script>
/* eslint-disable */
import axios from "axios";
import constant from "./../constant.js";
export default {
  name: "PlayerInfo",
  props: ["summonerName"],
  components: {},
  data: function() {
    return {
      summonerData: null,
      check: "not checked"
    };
  },
  mounted: function() {
    this.request();
  },
  methods: {
    async request() {
      axios
        .get(
          "https://euw1.api.riotgames.com/lol/league/v4/positions/by-summoner/" +
            constant.MY_SUMMONER_ID,
          { params: { api_key: constant.API_KEY } }
        )
        .then(response => {
          this.summonerData = response.data[0];
          console.log(JSON.stringify(this.summonerData));
          this.check = "reponse good!";
        })
        .catch(error => {
          this.check = error;
        });
    }
  }
};
</script>
