<template>
<div id="app">
  <v-app>
    <v-content
     v-touch="{
      left: () => drawer = false,
      right: () => drawer = servers.length > 1
    }">
      <clients></clients>
      <events></events>
    </v-content>
    <v-snackbar
      :timeout="snack.timeout"
      :color="snack.color"
      v-model="snack.visible">
      {{snack.text}}
    </v-snackbar>
    <v-toolbar fixed app dense>
      <v-toolbar-title style="margin-left:15px;">
        <v-toolbar-side-icon @click.native="drawer = !drawer" v-if="servers.length > 1"></v-toolbar-side-icon>
        <span>{{(server ? server.name : '')}}</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items>
        <v-text-field
        append-icon="search"
        single-line
        clearable
        hide-details
        v-model="search"
      ></v-text-field>
      </v-toolbar-items>
    </v-toolbar>
    <v-navigation-drawer temporary hide-overlay fixed v-model="drawer" class="text-xs-center" app>
      <v-list class="pt-0" dense>
        <v-list-tile v-for="srv in servers" :key="srv.id" @click="changeServer(srv.id)">
          <v-list-tile-action>
            <v-icon>storage</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>{{srv.name}}</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
  </v-app>
</div>
</template>

<script>
import Clients from './components/Clients'
import Events from './components/Events'

export default {
  name: 'app',
  components: {
    Clients,
    Events
  },
  methods: {
    loadData() {
      this.$store.dispatch('refresh')
    },
    changeServer(newServer) {
      this.$store.dispatch('changeServer', {server: newServer})
      this.drawer = false
      this.search = ''
    },
    notify(text, type) {
      this.snack.text = text
      this.snack.color = type
      this.snack.multi = type === 'error'
      this.snack.visible = true
    },
  },
  computed: {
    event() {
      return this.$store.state.event
    },
    server() {
      return this.$store.state.servers.find((srv) => srv.id === this.$store.state.server)
    },
    servers() {
      return this.$store.state.servers
    }
  },
  watch: {
    event: function (value) {
      this.notify(`${value.node} ${value.event}ed`, (value.event === 'connect' ? 'success' : 'error'))
    },
    search: function (value) {
      this.$store.commit('changeSearch', {text: value || ''})
    }
  },
  data () {
    return {
      snack: {
        visible: false,
        timeout: 3000,
        color: 'success',
        text: ''
      },
      search: '',
      drawer: false
    }
  }
}
</script>

<style>
</style>
