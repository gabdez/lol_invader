<template>
  <ion-app>
    <ion-content padding class="contentWallpaper">
      <h1>
        <slot></slot>
      </h1>
      <ion-button @click="$router.go(-1)">
        <ion-icon slot="start" name="arrow-back"></ion-icon>back
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


