// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import Vuex from 'vuex'
import axios from 'axios'
import moment from 'moment'

import App from './App'

Vue.config.productionTip = false
Vue.use(Vuetify)
Vue.use(Vuex)

/* eslint-disable no-new */
const store = new Vuex.Store({
  state: {
    server: 0,
    servers: [],
    total: 0,
    search: '',
    nodes: [],
    events: [],
    event: {}
  },
  mutations: {
    updateEvents(state, payload) {
      state.events = payload.events
    },
    updateNodes(state, payload) {
      state.nodes = payload.nodes
    },
    addEvent(state, payload) {
      const event = payload.event
      state.nodes = state.nodes.filter((node) => node.name !== event.node)
      if (event.event === 'connect')
        state.nodes.push({
          country_code: event.country_code,
          country_name: event.country_name,
          name: event.node,
          pub: event.pub,
          timestamp: event.timestamp,
          vpn: event.vpn
        })
      state.events.unshift(event)
      state.events.pop()
      state.event = event
    },
    changeServer(state, payload) {
      state.server = payload.server
    },
    changeSearch(state, payload) {
      state.search = payload.text
    }
  },
  actions: {
    changeServer(context, payload) {
      context.commit('changeServer', {
        server: payload.server
      })
      context.dispatch('refresh')
    },
    changePage(context, opt) {
      axios.get(`/log/${store.state.server}/${opt.page}/${opt.size}/${store.state.search}`)
      .then((response) => {
        store.commit({
          type: 'updateEvents',
          events: response.data
        })
      })
    },
    refresh (context) {
      axios.get(`/entries/${store.state.server}`)
        .then((response) => {
          const nodes = response.data.map((node) => {
            node.link = 'https://freegeoip.net/?q=' + node.pub
            node.flagImg = '/static/images/flags/unknown.jpg'
            node.flagTitle = 'Unknown Country'
            return node
          })
          context.commit({
            type: 'updateNodes',
            nodes: nodes
          })
        })  
    }
  }
})

new Vue({
  el: '#app',
  template: '<App/>',
  components: { App },
  store,
  computed: {
    server () {
      return this.$store.state.server
    }
  },
  watch: {
    'server': (val) => {
      axios.get(`/log/${val}/size/${store.state.search}`)
        .then((response) => store.state.total = response.data.value)
    }
  },
  beforeMount () {
    axios.get('/servers')
      .then((response) => {
        store.state.servers = response.data
        store.commit('changeServer', {
          server: response.data[0].id
        })
        axios.get(`/log/${store.state.server}/size/${store.state.search}`)
          .then((response) => store.state.total = response.data.value)
      })
    const socket = new WebSocket(window.location.origin.replace('http','ws') + '/live/log')
    socket.onmessage = (event) => {
      event = JSON.parse(event.data)
      if (event.server === store.state.server)
        store.commit({
          type: 'addEvent',
          event: event
        })
    }
  }
})
