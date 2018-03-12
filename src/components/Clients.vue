<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="nodes"
      hide-actions
      class="elevation-1"
      >
      <template slot="items" slot-scope="props">
        <td><img :src='props.item.flagImg' :title='props.item.flagTitle' /></td>
        <td class="text-xs-center">{{ props.item.name }}</td>
        <td class="text-xs-center">{{ props.item.vpn }}</td>
        <td class="text-xs-center"><a :href="props.item.link" target="_blank">{{ props.item.pub }}</a></td>
        <td class="text-xs-center">{{ props.item.timestamp }}</td>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>
  import moment from 'moment'
  export default {
    name: 'clients',
    created () {
      this.$store.dispatch('refresh')
    },
    computed: {
      nodes () {
        const nodes = this.$store.state.nodes
        nodes.forEach((node) => {
          if (node.country_code) {
            node.flagImg = '/static/images/flags/' + node.country_code + '.png'
            node.flagTitle = node.country_name
          } else {
            node.flagImg = '/static/images/flags/unknown.jpg'
            node.flagTitle = 'N/A'
          }
          node.timestamp = moment(node.timestamp * 1000).format('HH:mm - DD.MM.YY')
        })
        return nodes
      },
      server () {
        return this.$store.state.server
      },
      servers () {
        return this.$store.state.servers
      }
    },
    data () {
      return {
        headers: [
        {sortable: true, value: 'country_name'},{
          text: 'Node',
          align: 'center',
          sortable: true,
          value: 'name'
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
