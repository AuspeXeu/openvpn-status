<template>

  <md-layout md-align='center'>
   <md-table-card class="md-flex-33 md-flex-small-66">
    <md-toolbar>
      <h1 class='md-title'>Event Log</h1>
    </md-toolbar>

    <md-table>
      <md-table-header>
        <md-table-row>
          <md-table-head></md-table-head>
          <md-table-head>Node</md-table-head>
          <md-table-head>Time</md-table-head>
        </md-table-row>
      </md-table-header>

      <md-table-body>
        <md-table-row v-for="event in events" :key="event.timestamp + event.node">
          <md-table-cell>
            <md-icon :title="event.event">{{event.icon}}</md-icon>
          </md-table-cell>
          <md-table-cell>{{event.node}}</md-table-cell>
          <md-table-cell>{{event.timestamp}}</md-table-cell>
        </md-table-row>
      </md-table-body>
    </md-table>

    <md-toolbar class="md-transparent">
      <h2 class="md-title" style="flex:1;"></h2>
      <span>{{(1+((page-1)*size)) + '-' + (page*size) + ' of ' + total}}</span>
      <md-button @click.native='back' class="md-icon-button md-table-pagination-next" :disabled="page < 2 ? true : false"><md-icon>keyboard_arrow_left</md-icon></md-button>
      <md-button @click.native='forward' class="md-icon-button md-table-pagination-next" :disabled="page == Math.ceil(total/size) ? true : false"><md-icon>keyboard_arrow_right</md-icon></md-button>
    </md-toolbar>
  </md-table-card>

</md-layout>

</template>

<script>
  import moment from 'moment'
  export default {
    name: 'events',
    data: function() { 
      return{
        size: 10,
        page: 1
      }
    },
    computed: {
      events () {
        const events = this.$store.state.events
        events.forEach((ev) => {
          ev.timestamp = moment(ev.timestamp * 1000).format('HH:mm - DD.MM.YY')
        })
        return events
      },
      total () {
        return this.$store.state.total
      },
      server () {
        return this.$store.state.server
      }
    },
    watch: {
      'server': function (value) {
        this.page = 1
        this.$store.dispatch('changePage',{page:this.page,size:this.size})
      }
    },
    beforeMount() {
      this.$store.dispatch('changePage',{page:this.page,size:this.size})
    },
    methods: {
      back() {
        this.page -= 1
        this.$store.dispatch('changePage',{page:this.page,size:this.size})
      },
      forward() {
        this.page += 1
        this.$store.dispatch('changePage',{page:this.page,size:this.size})
      }
    }
  }
</script>