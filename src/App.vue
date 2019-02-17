<template>
  <ion-app>
    <transition name="fade">
      <keep-alive :include="['home','summonerView']">
        <router-view :key="$route.fullPath"></router-view>
      </keep-alive>
    </transition>
  </ion-app>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
ion-button {
  --box-shadow: 0px 0px 0px 0px !important;
}
</style>
