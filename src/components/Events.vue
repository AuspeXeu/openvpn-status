<template>
  <v-container>
    <v-layout row>
      <v-flex lg8 offset-lg2 md10 offset-md1 xs10 offset-xs1>
        <v-data-table
          :headers="headers"
          :items="events"
          :items-per-page-options="[25,50,{text:'All',value:-1}]"
          :server-items-length="total"
          sort-by="timestamp"
          :sort-desc="true"
          @pagination="updatePagination"
          :loading="loading"
          class="elevation-1">
          <template #item.pub="{value}">
            <a :href="`http://geoiplookup.net/ip/${value}`" target="_blank">{{ value }}</a>
          </template>
          <template #item.time="{item}">
            {{ eventTime(item) }}
          </template>
          <template #item.icon="{item}">
            <v-tooltip right>
              <template v-slot:activator="{on}">
                <v-icon v-on="on" :style="`color:${eventColor(item)};`">{{ eventIcon(item) }}</v-icon>
              </template>
              <span>{{ item.event }}</span>
            </v-tooltip>
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

export default {
  name: 'events',
  data() {
    return {
      debounce: false,
      pagination: null,
      headers: [{
        value: 'icon',
        sortable: false,
        width: '50px'
      }, {
        text: 'Node',
        align: 'center',
        sortable: false,
        value: 'node'
      }, {
        text: 'VPN IP',
        align: 'center',
        sortable: false,
        value: 'vpn'
      }, {
        text: 'Public IP',
        align: 'center',
        sortable: false,
        value: 'pub'
      }, {
        text: 'Time',
        align: 'center',
        sortable: false,
        value: 'time'
      }]
    }
  },
  computed: mapState({
    dateFormat: state => state.config.dateFormat,
    loading: 'eventsLoading',
    search: 'search',
    events: 'events',
    total: 'total',
    server: 'server'
  }),
  mounted() {
    store.dispatch('changePage', {page: 0, size: 25})
  },
  methods: {
    updatePagination(val) {
      this.pagination = val
    },
    changePage(pagination) {
      if (!pagination)
        return
      const { page, itemsPerPage } = pagination
      store.dispatch('changePage', {page: page || 1, size: itemsPerPage || 25})
    },
    eventTime(event) {
      return moment(event.timestamp * 1000).format(this.dateFormat)
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
      handler(nVal) {
        this.changePage(nVal)
      },
      immediate: true
    },
    search() {
      if (this.debounce)
        clearTimeout(this.debounce)
      this.debounce = setTimeout(() => {
        this.changePage(this.pagination)
        this.debounce = false
      }, 300)
    },
    server() {
      this.pagination = { page: 1, rowsPerPage: 25 }
    }
  }
}
</script>
