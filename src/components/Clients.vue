<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="nodes"
      :search="search"
      hide-actions
      :custom-sort="customSort"
      class="elevation-1"
      :loading="loading"
      >
      <template slot="items" slot-scope="props">
        <td>
          <v-tooltip right>
            <img :src="flagImg(props.item)" slot="activator" />
            <span>{{ flagTitle(props.item) }}</span>
          </v-tooltip>
        </td>
        <td class="text-xs-center">{{ props.item.node }}</td>
        <td class="text-xs-center">{{ props.item.vpn }}</td>
        <td class="text-xs-center"><a :href="`http://geoiplookup.net/ip/${props.item.pub}`" target="_blank">{{ props.item.pub }}</a></td>
        <td class="text-xs-center">
          <v-tooltip bottom>
            <span slot="activator">{{ formatTime(props.item.connected) }}</span>
            <span>Last ping: {{ formatTime(props.item.ping) }}</br></span>
            <span>Online: {{ onlineTime(props.item.connected) }}</span>
          </v-tooltip>
        </td>
        <td>
          <v-tooltip top>
            <v-icon style="color:#28ba0e;" slot="activator">fa-arrow-up</v-icon>
            <span>{{ formatDataVolume(props.item.sent) }} sent</span>
          </v-tooltip>
          <v-tooltip bottom>
            <v-icon style="color:#4221a5;" slot="activator">fa-arrow-down</v-icon>
            <span>{{ formatDataVolume(props.item.received) }} received</span>
          </v-tooltip>
        </td>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>
import moment from 'moment'
import axios from 'axios'
import { mapState } from 'vuex'
export default {
  name: 'clients',
  methods: {
    customSort(items, col, isDesc) {
      if (!items)
        return
      let keys = new Map()
      if (col === 'country_name')
        items.forEach((itm) => keys.set(itm.node, `${itm.country_name}${itm.node}${itm.pub}`))
      else
        items.forEach((itm) => keys.set(itm.node, itm[col]))
      items.sort((a,b) => {
        if (keys.get(a.node) < keys.get(b.node))
          return (isDesc ? 1 : -1)
        if (keys.get(a.node) > keys.get(b.node))
          return (isDesc ? -1 : 1)
        return 0
      })
      return items
    },
    formatDataVolume(vol) {
      vol = vol / 1000 / 1000 / 1000
      if (vol > 1)
        return `${vol.toFixed(2)} GB`
      vol = vol * 1000
      if (vol > 1)
        return `${vol.toFixed(2)} MB`
      vol = vol * 1000
      if (vol > 1)
        return `${vol.toFixed(2)} KB`
      vol = vol * 1000
      if (vol > 1)
        return `${vol.toFixed(2)} B`
    },
    onlineTime(connected) {
      return moment.duration(moment().diff(moment(connected * 1000))).humanize()
    },
    formatTime(ts) {
      return moment(ts * 1000).format('HH:mm - DD.MM.YY')
    },
    flagTitle(node) {
      return (node.country_code ? node.country_name : 'Unknown Country')
    },
    flagImg(node) {
      return `./static/images/flags/${(node.country_code ? `${node.country_code}.png` : 'unknown.jpg')}`
    }
  },
  computed: mapState({
    loading: state => state.clientsLoading,
    search: state => state.search,
    nodes: state => {
      return state.nodes.map((node) => {
        if (!node.country_code)
          node.country_code = axios.get(`./country/${node.pub}`)
            .then((response) => {
              node.country_name = response.data.country_name
              node.country_code = response.data.country_code
            })
        return node
      })
    },
    servers: state => state.servers
  }),
  data() {
    return {
      headers: [{
        sortable: true,
        value: 'country_name',
        width: '50px'
      },{
        text: 'Node',
        align: 'center',
        sortable: true,
        value: 'node'
      },{
        text: 'VPN IP',
        align: 'center',
        sortable: true,
        value: 'vpn'
      },{
        text: 'Public IP',
        align: 'center',
        sortable: true,
        value: 'pub'
      },{
        text: 'Connected',
        align: 'center',
        sortable: true,
        value: 'connected'
      },{
        text: 'Traffic',
        sortable: false,
        width: '100px'
      }]
    }
  }
}
</script>

<style scoped>
img {
  max-width: initial;
}
</style>
