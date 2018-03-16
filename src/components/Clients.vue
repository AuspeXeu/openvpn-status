<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="nodes"
      :search="search"
      hide-actions
      class="elevation-1"
      >
      <template slot="items" slot-scope="props">
        <td><img :src="props.item.flag" :title="flagTitle(props.item)" /></td>
        <td class="text-xs-center">{{ props.item.node }}</td>
        <td class="text-xs-center">{{ props.item.vpn }}</td>
        <td class="text-xs-center"><a :href="`https://freegeoip.net/?q=${props.item.pub}`" target="_blank">{{ props.item.pub }}</a></td>
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
      formatTime(ts) {
        return moment(ts * 1000).format('HH:mm - DD.MM.YY')
      },
      flagTitle(node) {
        return (node.country_code ? node.country_name : 'Unknown Country')
      }
    },
    computed: {
      search() {
        return this.$store.state.search
      },
      nodes() {
        return this.$store.state.nodes.map((node) => {
          if (!node.flag) {
            node.flag = '/static/images/flags/unknown.jpg'
            axios.get(`/country/${node.pub}`)
              .then((response) => {
                node.country_name = response.data.country_name
                node.flag = `/static/images/flags/${response.data.country_code}.png`
              })
          }
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
