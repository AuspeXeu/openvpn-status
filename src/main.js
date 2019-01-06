import '@babel/polyfill'
import moment from 'moment'
import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'
import './plugins/vuetify'
import App from './App.vue'
import router from './router'
import store from './store'

Vue.config.productionTip = false
const {mapState} = Vuex

new Vue({
  router,
  store,
  render: h => h(App),
  computed: mapState({
    server: state => state.server
  }),
  watch: {
    server(val) {
      axios.get(`./log/${val}/size/${store.state.search}`)
        .then(response => store.state.total = response.data.value)
    },
    $route(to) {
      try {
        const srvId = parseInt(to.params.id, 10)
        store.dispatch('changeServer', {server: srvId})
      } catch (e) {
        console.error(e)
      }
    }
  },
  mounted() {
    let srvId
    try {
      srvId = parseInt(this.$route.params.id, 10)
    } catch (e) {
      console.error(e)
    }
    store.commit('updateTime', {time: moment().unix()})
    axios.get('./servers')
      .then(response => {
        store.state.servers = response.data
        store.dispatch('changeServer', {
          server: srvId || response.data[0].id
        })
      })
    axios.get('./time')
      .then(response => {
        store.commit('updateTime', {
          time: response.data.time
        })
      })
    axios.get('./cfg')
      .then(response => {
        store.commit('updateConfig', response.data)
      })
    const socket = new ReconnectingWebSocket(`${window.location.origin.replace('http', 'ws')}/live/log`)
    const handleMsg = msg => {
      if (msg.server !== store.state.server)
        return
      if (msg.event === 'update')
        store.commit({
          type: 'updateNode',
          event: msg
        })
      else
        store.commit({
          type: 'addEvent',
          event: msg
        })
    }
    socket.onmessage = ({data}) => {
      const received = JSON.parse(data)
      if (Array.isArray(received))
        received.forEach(msg => handleMsg(msg))
      else
        handleMsg(received)
    }
  }
}).$mount('#app')
