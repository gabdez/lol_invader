<template>
  <ion-app>
    <transition name="fade">
      <router-view></router-view>
    </transition>
  </ion-app>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter, .fade-leave-to /* .fade-leave-active below version 2.1.8 */ {
  opacity: 0;
}
</style>
