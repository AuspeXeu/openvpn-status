<template>
  <v-container>
    <v-layout row>
      <v-flex lg8 offset-lg2 md10 offset-md1 xs10 offset-xs1>
        <v-data-table
          :headers="headers"
          :items="events"
          :rows-per-page-items="[10,25,{text:'All',value:-1}]"
          :total-items="total"
          :pagination.sync="pagination"
          :loading="loading"
          class="elevation-1"
          >
          <template slot="items" slot-scope="props">
            <td>
              <v-icon :title="props.item.event" :style="`color:${eventColor(props.item)};`">{{ eventIcon(props.item) }}</v-icon>
            </td>
            <td class="text-xs-center">{{ props.item.node }}</td>
            <td class="text-xs-center">{{ eventTime(props.item) }}</td>
          </template>
        </v-data-table>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import moment from 'moment'
import { mapState } from 'vuex'
export default {
  name: 'events',
  data() { 
    return {
      debounce: false,
      pagination: {},
      headers: [{
        sortable: false,
        width: '50px'
      },{
        text: 'Node',
        align: 'center',
        sortable: false,
        value: 'node'
      },{
        text: 'Time',
        align: 'center',
        sortable: false,
        value: 'time'
      }]
    }
  },
  computed: mapState({
    loading: state => state.clientsLoading,
    search: state => state.search,
    events : state => state.events,
    total : state => state.total,
    server : state => state.server
  }),
  methods: {
    eventTime(event) {
      return moment(event.timestamp * 1000).format('HH:mm - DD.MM.YY')
    },
    eventIcon(event) {
      switch (event.event) {
        case 'connect': return 'fa-plug'
        case 'disconnect': return 'fa-times'
        case 'reconnect': return 'fa-repeat'
        default: return 'fa-question'
      }
    },
    eventColor(event) {
      switch (event.event) {
        case 'connect': return '#28ba0e'
        case 'disconnect': return '#c11919'
        case 'reconnect': return '#4221a5'
        default: return '#f27609'
      }
    }
  },
  watch: {
    pagination: {
      handler () {
        const { page, rowsPerPage } = this.pagination
        this.$store.dispatch('changePage',{page:page,size:rowsPerPage})
      },
      deep: true
    },
    search(value) {
      if (this.debounce)
        clearTimeout(this.debounce)
      this.debounce = setTimeout(() => {
        const { page, rowsPerPage } = this.pagination
        this.$store.dispatch('changePage',{page:page,size:rowsPerPage})
        this.debounce = false
      }, 300)
    },
    server: function (value) {
      this.pagination.page = 1
      const { page, rowsPerPage } = this.pagination
      this.$store.dispatch('changePage',{page:page,size:rowsPerPage})
    }
  }
}
</script>