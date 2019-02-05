<template>
  <div class="gameView">
    <PlayerInfo :summonerName="summonerName"/>
  </div>
</template>

<script>
// @ is an alias to /src
/* eslint-disable */
import PlayerInfo from "@/components/PlayerInfo.vue";

export default {
  name: "summonerView",
  components: {
    PlayerInfo
  },
  data: function() {
    return {
      summonerName: null,
      summonerData: null
    };
  },
  mounted: function() {
    this.summonerName = this.$route.params.summonerName;
  }
};
</script>
