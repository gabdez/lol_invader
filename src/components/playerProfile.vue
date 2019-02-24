<template>
  <div>details component
    <ion-button
      style="display: inline-block"
      class="outlineBtn"
      color="red"
      @click="$router.go(-1)"
    >
      <ion-icon slot="start" name="arrow-back"></ion-icon>back
    </ion-button>
  </div>
</template>

<script>
// @ is an alias to /src
/* eslint-disable */
export default {
  name: "PlayerProfile",
  props: {},
  components: {},
  mounted() {
    console.log(this.$route.params);
  }
};
</script>

<style>
</style>

