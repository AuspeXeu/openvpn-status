<template>

  <md-layout md-align='center' md-flex='50'>

   <md-table-card>
    <md-toolbar class="md-dense">
      <md-button class="md-icon-button" @click.native.stop.prevent.capture="toggleLeftSidenav">
        <md-icon>menu</md-icon>
      </md-button>

      <h2 class="md-title" style="flex: 1">{{(servers.length > 0 ? servers[server].name : '')}}</h2>

      <md-button @click.native='loadData' class='md-raised md-primary md-dense'>
        <md-icon>cached</md-icon> {{counter}}
      </md-button>
    </md-toolbar>

    <md-table>
      <md-table-header>
        <md-table-row>
          <md-table-head></md-table-head>
          <md-table-head>Node</md-table-head>
          <md-table-head>VPN IP</md-table-head>
          <md-table-head>Public IP</md-table-head>
          <md-table-head>Last Seen</md-table-head>
        </md-table-row>
      </md-table-header>

      <md-table-body>
        <md-table-row v-for="node in nodes" :key="node.name">
          <md-table-cell>
            <img :src='node.flagImg' :title='node.flagTitle' />
          </md-table-cell>
          <md-table-cell>{{node.name}}</md-table-cell>
          <md-table-cell>{{node.vpn}}</md-table-cell>
          <md-table-cell><a :href="node.link" target="_blank">{{node.pub}}</a></md-table-cell>
          <md-table-cell>{{formatTimestamp(node.timestamp)}}</md-table-cell>
        </md-table-row>
      </md-table-body>
    </md-table>

    <md-sidenav class="md-left" ref="leftSidenav" @open="open('Left')" @close="close('Left')">
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

  </md-table-card>

</md-layout>

</template>

<script>
  import moment from 'moment'
  export default {
    name: 'clients',
    created () {
      const vue = this
      setInterval(function () {
        vue.counter -= 1
        if (vue.counter == 0) {
          vue.loadData()
        }
      }, 1000)
      this.loadData()
    },
    methods: {
      formatTimestamp(timestamp) {
        return moment(timestamp * 1000).format('HH:mm - DD.MM.YYYY')
      },
      loadData() {
        this.$store.dispatch('refresh')
        this.counter = 30
      },
      toggleLeftSidenav() {
        this.$refs.leftSidenav.toggle()
      },
      changeServer(newServer) {
        this.counter = 30
        this.$store.dispatch('changeServer', {
          server: newServer
        })
        this.toggleLeftSidenav()
      }
    },
    computed: {
      nodes () {
        return this.$store.state.nodes
      },
      server () {
        return this.$store.state.server
      },
      servers () {
        return this.$store.state.servers
      }
    },
    data () {
      return {
        counter: 30
      }
    }
  }
</script>

<style scoped>
  .md-table-card{
    display: flex;
    flex-flow: column;
    position: relative;
    overflow: hidden;
    z-index: 1;
  }
</style>
