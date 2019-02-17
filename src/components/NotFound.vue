<template>
  <ion-app>
    <ion-content padding class="contentWallpaper">
      <h1>
        <slot></slot>
      </h1>
      <ion-button @click="$router.push('/')">
        <ion-icon slot="start" name="arrow-back"></ion-icon>back Login
      </ion-button>
    </ion-content>
  </ion-app>
</template>

<script>
// @ is an alias to /src

export default {
  name: "NotFound",
  components: {}
};
</script>

<style>
.contentWallpaper {
  --background: url("./../assets/wall2.jpg") no-repeat 100% 100% !important;
}
</style>

