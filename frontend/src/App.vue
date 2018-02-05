<template>
  <div id="app">
    <clients v-on:toggle-sidenav="toggleLeftSidenav"></clients>
    <events></events>
    <md-snackbar md-position="bottom center" ref="snackbar">
      <span>{{message}}</span>
      <md-button class="md-accent" md-theme="light-blue" @click.native="$refs.snackbar.close()">Dismiss</md-button>
    </md-snackbar>
    <md-sidenav class="md-left" ref="leftSidenav">
    <md-toolbar>
      <div class="md-toolbar-container">
        <h3 class="md-title">Servers</h3>
      </div>
    </md-toolbar>
    <md-list>
      <md-list-item v-for="srv in servers" :key="srv.id" @click.native="changeServer(srv.id)">
        <md-icon>storage</md-icon> <span>{{srv.name}}</span>
      </md-list-item>  
    </md-list>
  </md-sidenav>
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
    toggleLeftSidenav() {
      this.$refs.leftSidenav.toggle()
    },
    changeServer(newServer) {
      this.$store.dispatch('changeServer', {
        server: newServer
      })
      this.toggleLeftSidenav()
    }
  },
  computed: {
    event () {
      return this.$store.state.event
    },
    servers () {
      return this.$store.state.servers
    }
  },
  watch: {
    'event': function (value) {
      this.message = `${value.node} ${value.event}ed`
      this.$refs.snackbar.open()
    }
  },
  data () {
    return {
      message: ''
    }
  }
}
</script>

<style>
  .md-layout {
    padding-top:20px;
  }
  .md-table-cell {
    height: auto !important;
  }
  .md-table-head-container {
    height: auto !important;
    padding: 0px !important;
  }
  #app {
    padding-bottom: 20px;
  }
</style>
