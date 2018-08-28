import '@babel/polyfill'
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
  beforeMount() {
    let srvId
    try {
      srvId = parseInt(this.$route.params.id, 10)
    } catch (e) {
      console.error(e)
    }
    axios.get('./servers')
      .then(response => {
        store.state.servers = response.data
        store.dispatch('changeServer', {
          server: srvId || response.data[0].id
        })
      })
    // eslint-disable-next-line
    const socket = new ReconnectingWebSocket(`${window.location.origin.replace('http', 'ws')}/live/log`)
    socket.onmessage = ({data}) => {
      const event = JSON.parse(data)
      if (event.server !== store.state.server)
        return
      if (event.event === 'update')
        store.commit({
          type: 'updateNode',
          event
        })
      else
        store.commit({
          type: 'addEvent',
          event
        })
    }
  }
}).$mount('#app')
