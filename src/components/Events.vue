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
              <v-tooltip right>
                <v-icon slot="activator" :style="`color:${eventColor(props.item)};`">{{ eventIcon(props.item) }}</v-icon>
                <span>{{ props.item.event }}</span>
              </v-tooltip>
            </td>
            <td class="text-xs-center">
              <v-tooltip bottom :disabled="!props.item.vpn">
                <span slot="activator">{{ props.item.node }}</span>
                <span>{{ props.item.pub }} > {{ props.item.vpn }}</span>
              </v-tooltip>
            </td>
            <td class="text-xs-center">{{ eventTime(props.item) }}</td>
          </template>
        </v-data-table>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import moment from 'moment'
import {mapState} from 'vuex'
import store from '../store'
import config from '../../public/cfg.json'

export default {
  name: 'events',
  data() {
    return {
      debounce: false,
      pagination: {},
      headers: [{
        sortable: false,
        width: '50px'
      }, {
        text: 'Node',
        align: 'center',
        sortable: false,
        value: 'node'
      }, {
        text: 'Time',
        align: 'center',
        sortable: false,
        value: 'time'
      }]
    }
  },
  computed: mapState({
    loading: 'clientsLoading',
    search: 'search',
    events: 'events',
    total: 'total',
    server: 'server'
  }),
  methods: {
    eventTime(event) {
      return moment(event.timestamp * 1000).format(config.date_format)
    },
    eventIcon(event) {
      const map = new Map([['connect', 'fa-plug'], ['disconnect', 'fa-times'], ['reconnect', 'fa-redo']])
      return map.get(event.event) || 'fa-question'
    },
    eventColor(event) {
      const map = new Map([['connect', '#28ba0e'], ['disconnect', '#c11919'], ['reconnect', '#4221a5']])
      return map.get(event.event) || '#f27609'
    }
  },
  watch: {
    pagination: {
      handler() {
        const { page, rowsPerPage } = this.pagination
        store.dispatch('changePage', {page, size: rowsPerPage})
      },
      deep: true
    },
    search() {
      if (this.debounce)
        clearTimeout(this.debounce)
      this.debounce = setTimeout(() => {
        const { page, rowsPerPage } = this.pagination
        store.dispatch('changePage', {page, size: rowsPerPage})
        this.debounce = false
      }, 300)
    },
    server() {
      this.pagination.page = 1
      const { page, rowsPerPage } = this.pagination
      store.dispatch('changePage', {page, size: rowsPerPage})
    }
  }
}
</script>
