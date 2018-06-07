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
        <td><img :src="flagImg(props.item)" :title="flagTitle(props.item)" /></td>
        <td class="text-xs-center">{{ props.item.node }}</td>
        <td class="text-xs-center">{{ props.item.vpn }}</td>
        <td class="text-xs-center"><a :href="`http://geoiplookup.net/ip/${props.item.pub}`" target="_blank">{{ props.item.pub }}</a></td>
        <td class="text-xs-center">{{ formatTime(props.item.timestamp) }}</td>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>
  import moment from 'moment'
  import axios from 'axios'
  export default {
    name: 'clients',
    created () {
      this.$store.dispatch('refresh')
    },
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
    computed: {
      loading() {
        return this.$store.state.clientsLoading
      },
      search() {
        return this.$store.state.search
      },
      nodes() {
        return this.$store.state.nodes.map((node) => {
          if (!node.country_code)
            axios.get(`./country/${node.pub}`)
              .then((response) => {
                node.country_name = response.data.country_name
                node.country_code = response.data.country_code
              })
          return node
        })
      },
      servers() {
        return this.$store.state.servers
      }
    },
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
          value: 'timestamp'
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
