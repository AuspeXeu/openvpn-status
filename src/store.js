import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

Vue.use(Vuex)

let timer
export default new Vuex.Store({
  state: {
    event: false,
    server: 0,
    servers: [],
    total: 0,
    serverTime: 0,
    config: {
      dateFormat: 'HH:mm - DD.MM.YY'
    },
    tab: 'clients',
    updateNode: false,
    eventsLoading: true,
    clientsLoading: true,
    search: '',
    nodes: [],
    events: []
  },
  mutations: {
    updateTab(state, payload) {
      state.tab = payload
    },
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
          lat: event.lat,
          lon: event.lon,
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
    updateConfig(state, payload) {
      state.config = payload
    },
    updateTime(state, payload) {
      const {time} = payload
      state.serverTime = time
      if (timer)
        clearInterval(timer)
      timer = setInterval(() => state.serverTime++, 1000)
    },
    changeServer(state, payload) {
      state.server = payload.server
      state.nodes = []
      state.events = []
    },
    changeSearch(state, payload) {
      state.search = payload.text
    },
    changeView(state, payload) {
      state.view = payload.view
      if (['events', 'map', 'clients'].indexOf(payload.view) >= 0)
        state.tab = payload.view
      else
        state.tab = 'clients'
    }
  },
  actions: {
    changeServer({commit, dispatch}, payload) {
      if (this.state.server === payload.server)
        return
      commit('changeServer', {
        server: payload.server
      })
      dispatch('loadClients')
    },
    changePage({commit}, opt) {
      this.state.eventsLoading = true
      const p0 = axios.get(`./log/${this.state.server}/${opt.page}/${opt.size}/${this.state.search}`)
        .then(response => {
          commit({
            type: 'updateEvents',
            events: response.data
          })
        })
      const p1 = axios.get(`./log/${this.state.server}/size/${this.state.search}`)
        .then(response => this.state.total = response.data.value)
      Promise.all([p0, p1]).then(() => this.state.eventsLoading = false)
    },
    loadClients({commit}) {
      this.state.clientsLoading = true
      axios.get(`./entries/${this.state.server}`)
        .then(response => {
          commit({type: 'updateNodes', nodes: response.data})
          this.state.clientsLoading = false
        })
    }
  }
})
