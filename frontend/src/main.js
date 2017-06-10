// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import VueMaterial from 'vue-material'
import 'vue-material/dist/vue-material.css'
import Vuex from 'vuex'
import $ from 'jquery'
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
      $.get(`/log/${store.state.server}/${opt.page}/${opt.size}`)
      .done((data) => {
        store.commit({
          type: 'updateEvents',
          events: data
        })
      })
    },
    refresh (context) {
      $.get(`/entries/${store.state.server}`)
      .done((data) => {
        var nodes = data.map(function(node) { 
          node.link = 'https://freegeoip.net/?q='+node.pub
          node.flagImg = '/static/images/flags/unknown.jpg'
          node.flagTitle = 'Unknown Country'
          
          $.get('/geoip/' + node.pub)
          .done(function (data) {
            node.flagImg = '/static/images/flags/' + data.country.iso_code + '.png'
            node.flagTitle = data.country.names.en
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
    'server': function (val) {
      $.get(`/log/${val}/size`)
      .done((data) => {
        store.state.total = data.value
      })
    }
  },
  beforeMount: function() {
    $.get(`/log/${store.state.server}/size`)
    .done((data) => {
      store.state.total = data.value
    })
    $.get(`/servers`)
    .done((data) => {
      store.state.servers = data
    })
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
