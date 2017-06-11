// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.css'
import Vuex from 'vuex'
import axios from 'axios'
import moment from 'moment'

import App from './App'

Vue.config.productionTip = false
Vue.use(VueMaterial)
Vue.use(Vuex)

const eventHelper = (item) => {
 if (item.event === 'connect') {
  item.help = 'This node just established a connection to the server.'
  item.icon = 'check'
} else if (item.event === 'disconnect') {
  item.help = 'This node just closed the connection to the server.'
  item.icon = 'error'
}
return item
}

/* eslint-disable no-new */
const store = new Vuex.Store({
  state: {
    server: 0,
    servers: [],
    total: 0,
    nodes: [],
    events: []
  },
  mutations: {
    updateEvents (state, payload) {
      state.events = payload.events.map(eventHelper)
    },
    updateNodes (state, payload) {  
      state.nodes = payload.nodes
    },
    addEvent (state, payload) {
      const event = eventHelper(payload.event)
      state.events.unshift(event)
      store.state.total += 1
      state.events.pop()
    },
    changeServer (state, payload) {
      state.server = payload.server
    }
  },
  actions: {
    changeServer (context, payload) {
      context.commit('changeServer', {
        server: payload.server
      })
      context.dispatch('refresh')
    },
    changePage (context, opt) {
      axios.get(`/log/${store.state.server}/${opt.page}/${opt.size}`)
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
          const nodes = response.data.map(function(node) { 
            node.link = 'https://freegeoip.net/?q='+node.pub
            node.flagImg = '/static/images/flags/unknown.jpg'
            node.flagTitle = 'Unknown Country'
            
            axios.get(`/geoip/${node.pub}`)
            .then((response) => {
              node.flagImg = '/static/images/flags/' + response.data.country.iso_code + '.png'
              node.flagTitle = response.data.country.names.en
            })
            
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
      axios.get(`/log/${val}/size`)
        .then((response) => store.state.total = response.data.value)
    }
  },
  beforeMount: function() {
    axios.get(`/log/${store.state.server}/size`)
      .then((response) => store.state.total = response.data.value)
    axios.get(`/servers`)
      .then((response) => store.state.servers = response.data)
    const socket = new WebSocket(window.location.origin.replace('http','ws') + `/live/${store.state.server}/log`)
    socket.onmessage = (event) => {
      event = JSON.parse(event.data)
      store.commit({
        type: 'addEvent',
        event: event
      })
    }
  }
})
