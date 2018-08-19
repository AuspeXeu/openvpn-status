import Vue from 'vue'
import Vuetify from 'vuetify'
import VueRouter from 'vue-router'
import 'vuetify/dist/vuetify.min.css'
import Vuex from 'vuex'
import axios from 'axios'

import App from './App'

Vue.config.productionTip = false
Vue.use(VueRouter)
Vue.use(Vuetify)
Vue.use(Vuex)

const {mapState} = Vuex

const router = new VueRouter({
  routes: [{ path: '/:id' }]
})

/* eslint-disable no-new */
const store = new Vuex.Store({
  state: {
    event: false,
    server: 0,
    servers: [],
    total: 0,
    updateNode: false,
    eventsLoading: true,
    clientsLoading: true,
    search: '',
    nodes: [],
    events: []
  },
  mutations: {
    updateEvents(state, payload) {
      state.events = payload.events
    },
    updateNodes(state, payload) {
      state.nodes = payload.nodes
    },
    updateNode(state, payload) {
      const {event} = payload
      const node = state.nodes.find(itm => itm.node === event.node)
      if (node) {
        node.cid = event.cid
        node.received = event.received
        node.sent = event.sent
        node.pub = event.pub
        node.vpn = event.vpn
        node.seen = event.timestamp
        node.connected = event.connected
        state.updateNode = node
      }
    },
    addEvent(state, payload) {
      const {event} = payload
      state.event = event
      state.nodes = state.nodes.filter(itm => itm.node !== event.node)
      if (event.event !== 'disconnect')
        state.nodes.push({
          node: event.node,
          pub: event.pub,
          country_name: event.country_name,
          country_code: event.country_code,
          connected: event.connected,
          seen: event.seen,
          vpn: event.vpn
        })
      if (event.node.includes(state.search)) {
        const oLen = state.events.length
        state.events = state.events.filter(itm => itm.id !== event.id)
        state.events.unshift(event)
        if (oLen !== state.events.length)
          state.events.pop()
      }
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
    changeServer({commit, dispatch}, payload) {
      commit('changeServer', {
        server: payload.server
      })
      dispatch('refresh')
    },
    changePage({commit}, opt) {
      store.state.eventsLoading = true
      const p0 = axios.get(`./log/${store.state.server}/${opt.page}/${opt.size}/${store.state.search}`)
        .then((response) => {
          commit({
            type: 'updateEvents',
            events: response.data
          })
        })
      const p1 = axios.get(`./log/${store.state.server}/size/${store.state.search}`)
        .then(response => store.state.total = response.data.value)
      Promise.all([p0, p1]).then(() => store.state.eventsLoading = false)
    },
    refresh({commit}) {
      store.state.clientsLoading = true
      axios.get(`./entries/${store.state.server}`)
        .then((response) => {
          commit({type: 'updateNodes', nodes: response.data})
          store.state.clientsLoading = false
        })
    }
  }
})

new Vue({
  router,
  el: '#app',
  template: '<App/>',
  components: { App },
  store,
  computed: mapState({
    server: state => state.server
  }),
  watch: {
    server(val) {
      axios.get(`./log/${val}/size/${store.state.search}`)
        .then(response => store.state.total = response.data.value)
    },
    '$route'(to) {
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
      if (event.server !== store.state.server)
        return
      if (event.event === 'update')
        store.commit({
          type: 'updateNode',
          event: event
        })
      else
        store.commit({
          type: 'addEvent',
          event: event
        })
    }
  }
})
