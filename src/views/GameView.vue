<template>
  <ion-app class="gameView">
    <listPlayersGame :dataGame="data"></listPlayersGame>
  </ion-app>
</template>

<script>
// @ is an alias to /src
/* eslint-disable */
import listPlayersGame from "@/components/listPlayersGame.vue";
export default {
  name: "gameView",
  components: { listPlayersGame },
  props: { data: {} },
  data: function() {
    return {};
  },
  mounted: function() {},
  methods: {}
};
</script>
