<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="events"
      :rows-per-page-items="[10,25,{text:'All',value:-1}]"
      :total-items="total"
      :pagination.sync="pagination"
      class="elevation-1"
      >
      <template slot="items" slot-scope="props">
        <td>
          <v-icon :title="props.item.event" :style="`color:${eventColor(props.item)};`">{{ eventIcon(props.item) }}</v-icon>
        </td>
        <td class="text-xs-center">{{ props.item.node }}</td>
        <td class="text-xs-center">{{ props.item.time }}</td>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>
  import moment from 'moment'
  export default {
    name: 'events',
    data() { 
      return {
        pagination: {},
        headers: [
          {sortable: false},{
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
    computed: {
      events () {
        const events = this.$store.state.events
        events.forEach((ev) => {
          ev.time = moment(ev.timestamp * 1000).format('HH:mm - DD.MM.YY')
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
    methods: {
      eventIcon(event) {
        return (event.event === 'connect' ? 'fa-plug' : 'fa-times')
      },
      eventColor(event) {
        return (event.event === 'connect' ? '#28ba0e' : '#c11919')
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
      'server': function (value) {
        this.pagination.page = 1
        this.$store.dispatch('changePage',{page:page,size:rowsPerPage})
      }
    }
  }
</script>