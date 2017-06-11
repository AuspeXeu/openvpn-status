<template>
  <div id="app">
    <clients></clients>
    <events></events>
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
  }
}
</script>

<style>
  .md-layout{
    padding-top:20px;
  }
  .md-table-cell{
    height: auto !important;
  }
  .md-table-head-container{
    height: auto !important;
    padding: 0px !important;
  }
  #app {
    padding-bottom:20px;
  }
</style>
