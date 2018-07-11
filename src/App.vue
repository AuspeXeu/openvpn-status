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
      <v-toolbar-title>
        <v-toolbar-side-icon @click.native="drawer = !drawer" v-if="servers.length > 1"></v-toolbar-side-icon>
        <span>{{(server ? server.name : '')}}</span>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items>
        <v-text-field
        style="margin-top:5px;"
        append-icon="search"
        single-line
        clearable
        ref="searchField"
        @keyup.esc="search = ''"
        v-model="search"
      ></v-text-field>
      </v-toolbar-items>
    </v-toolbar>
    <v-navigation-drawer temporary hide-overlay fixed v-model="drawer" class="text-xs-center" app>
      <v-list class="pt-0" dense>
        <v-list-tile v-for="srv in servers" :key="srv.id" :to="`/${srv.id}`">
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
import { mapState } from 'vuex'

export default {
  name: 'app',
  components: {
    Clients,
    Events
  },
  methods: {
    notify(text, type) {
      this.snack.text = text
      this.snack.color = type
      this.snack.multi = type === 'error'
      this.snack.visible = true
    },
    onKeyDown(ev) {
      if (ev.keyCode === 70 && (ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault()
        this.$refs.searchField.focus()
      }
    }
  },
  created() {
    window.addEventListener('keydown', this.onKeyDown)
  },
  computed: mapState({
    event: state => state.event,
    server: state => state.servers.find((srv) => srv.id === state.server),
    servers: state => state.servers
  }),
  watch: {
    server(value) {
      this.drawer = false
      this.search = ''
    },
    event: function (value) {
      let type = 'error'
      switch (value.event) {
          case 'connect':
            type = 'success'
            break
          case 'disconnect':
            type = 'error'
            break
          case 'reconnect':
            type = 'info'
            break
          default:
            type = 'cyan darken-2'
            break
        }
      this.notify(`${value.node} ${value.event}ed`, type)
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
