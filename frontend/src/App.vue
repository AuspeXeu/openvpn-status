<template>
  <div id="app">
    <clients></clients>
    <events></events>
    <md-snackbar md-position="bottom center" ref="snackbar">
      <span>{{message}}</span>
      <md-button class="md-accent" md-theme="light-blue" @click.native="$refs.snackbar.close()">Dismiss</md-button>
    </md-snackbar>
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
  computed: {
    event () {
      return this.$store.state.event
    }
  },
  watch: {
    'event': function (value) {
      this.message = value.node + ' ' + value.event + 'ed'
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
