import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    playerProfile: []
  },
  mutations: {
    updatePlayerProfile(state, playerProfile) {
      state.playerProfile = playerProfile;
    }
  },
  getters: {
    getPlayerProfile: state => {
      return state.playerProfile;
    }
  },
  actions: {}
});
