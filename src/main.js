import Vue from 'vue'
import Vuetify from 'vuetify'
import VueRouter from 'vue-router'
import 'vuetify/dist/vuetify.min.css'
import Vuex from 'vuex'
import { mapState } from 'vuex'
import axios from 'axios'
import moment from 'moment'

import App from './App'

Vue.config.productionTip = false
Vue.use(VueRouter)
Vue.use(Vuetify)
Vue.use(Vuex)

const router = new VueRouter({
  routes: [{ path: '/:id' }]
})

/* eslint-disable no-new */
const store = new Vuex.Store({
  state: {
    server: 0,
    servers: [],
    total: 0,
    eventsLoading: true,
    clientsLoading: true,
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
      state.nodes = state.nodes.filter((node) => node.node !== event.node)
      if (event.event !== 'disconnect')
        state.nodes.push({
          node: event.node,
          pub: event.pub,
          country_name: false,
          country_code: false,
          timestamp: event.timestamp,
          vpn: event.vpn
        })
      if (event.node.includes(state.search)) {
        state.events = state.events.filter((itm) => itm.id !== event.id)
        state.events.unshift(event)
        state.events.pop()
      }
      state.event = event
    },
    changeServer(state, payload) {
      state.server = payload.server
      state.nodes = []
      state.events = []
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
      store.state.eventsLoading = true
      const p0 = axios.get(`./log/${store.state.server}/${opt.page}/${opt.size}/${store.state.search}`)
        .then((response) => {
          context.commit({
            type: 'updateEvents',
            events: response.data
          })
        })
      const p1 = axios.get(`./log/${store.state.server}/size/${store.state.search}`)
        .then((response) => store.state.total = response.data.value)
      Promise.all([p0,p1]).then(() => store.state.eventsLoading = false)
    },
    refresh(context) {
      store.state.clientsLoading = true
      axios.get(`./entries/${store.state.server}`)
        .then((response) => {
          const nodes = response.data.map((node) => {
            node.country_name = false
            node.country_code = false
            return node
          })
          context.commit({
            type: 'updateNodes',
            nodes: nodes
          })
          store.state.clientsLoading = false
        })  
    }
  }
})

new Vue({
  router: router,
  el: '#app',
  template: '<App/>',
  components: { App },
  store,
  computed: mapState({
    server: (state) => state.server
  }),
  watch: {
    server(val) {
      axios.get(`./log/${val}/size/${store.state.search}`)
        .then((response) => store.state.total = response.data.value)
    },
    '$route'(to, from) {
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
      .then((response) => {
        store.state.servers = response.data
        store.dispatch('changeServer', {
          server: srvId ? srvId : response.data[0].id
        })
      })
    const socket = new ReconnectingWebSocket(`${window.location.origin.replace('http','ws')}/live/log`)
    socket.onmessage = ({data}) => {
      const event = JSON.parse(data)
      if (event.server === store.state.server)
        store.commit({
          type: 'addEvent',
          event: event
        })
    }
  }
})
