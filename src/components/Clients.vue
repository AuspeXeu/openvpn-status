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
            <span>Last seen: {{ elabsedTime(props.item.seen) }}</span><br>
            <span>Online: {{ elabsedTime(props.item.connected) }}</span>
          </v-tooltip>
        </td>
        <td>
          <v-tooltip top>
            <v-icon :id="`${props.item.node}_sent`" slot="activator">fa-arrow-up</v-icon>
            <span>{{ formatDataVolume(props.item.sent) }} sent</span>
          </v-tooltip>
          <v-tooltip bottom>
            <v-icon :id="`${props.item.node}_received`" slot="activator">fa-arrow-down</v-icon>
            <span>{{ formatDataVolume(props.item.received) }} received</span>
          </v-tooltip>
        </td>
        <td>
          <v-tooltip left>
            <v-icon slot="activator" class="disconnect" style="cursor:pointer;" @click="disconnect(props.item.cid)">fa-skull</v-icon>
            <span>Disconnect client</span>
          </v-tooltip>
        </td>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>
import moment from 'moment'
import axios from 'axios'
import {mapState} from 'vuex'

export default {
  name: 'clients',
  methods: {
    customSort(items, col, isDesc) {
      if (!items)
        return
      const keys = new Map()
      if (col === 'country_name')
        items.forEach(itm => keys.set(itm.node, `${itm.country_name}${itm.node}${itm.pub}`))
      else
        items.forEach(itm => keys.set(itm.node, itm[col]))
      items.sort((a, b) => {
        if (keys.get(a.node) < keys.get(b.node))
          return (isDesc ? 1 : -1)
        if (keys.get(a.node) > keys.get(b.node))
          return (isDesc ? -1 : 1)
        return 0
      })
      return items
    },
    formatDataVolume(vol) {
      let volume = vol / 1000 / 1000 / 1000
      if (volume > 1)
        return `${volume.toFixed(2)} GB`
      volume *= 1000
      if (volume > 1)
        return `${volume.toFixed(2)} MB`
      volume *= 1000
      if (volume > 1)
        return `${volume.toFixed(2)} KB`
      volume *= 1000
      if (volume > 1)
        return `${volume.toFixed(2)} B`
    },
    elabsedTime(since) {
      return moment.duration(moment().diff(moment(since * 1000))).humanize()
    },
    formatTime(ts) {
      return moment(ts * 1000).format(this.dateFormat)
    },
    flagTitle(node) {
      return (node.country_code ? node.country_name : 'Unknown Country')
    },
    flagImg(node) {
      return `/flags/${(node.country_code ? `${node.country_code}.png` : 'unknown.jpg')}`
    },
    disconnect(cid) {
      axios.post(`/server/${this.severId}/disconnect/${cid}`)
    }
  },
  watch: {
    updateNode(nVal, oVal) {
      ['sent', 'received'].forEach(prop => {
        if (nVal[prop] === oVal[prop])
          return
        const el = document.getElementById(`${nVal.node}_${prop}`)
        if (!el)
          return
        const restore = el.className
        el.className += ` high_${prop}`
        setTimeout(() => el.className = restore, 4000)
      })
    }
  },
  computed: mapState({
    dateFormat: state => state.config.dateFormat,
    severId: 'server',
    updateNode: 'updateNode',
    loading: 'clientsLoading',
    search: 'search',
    nodes: 'nodes'
  }),
  data() {
    return {
      meta: {},
      headers: [{
        sortable: true,
        value: 'country_name',
        width: '50px'
      }, {
        text: 'Node',
        align: 'center',
        sortable: true,
        value: 'node'
      }, {
        text: 'VPN IP',
        align: 'center',
        sortable: true,
        value: 'vpn'
      }, {
        text: 'Public IP',
        align: 'center',
        sortable: true,
        value: 'pub'
      }, {
        text: 'Connected',
        align: 'center',
        sortable: true,
        value: 'connected'
      }, {
        text: 'Traffic',
        sortable: false,
        width: '100px'
      }, {
        text: 'Action',
        sortable: false,
        width: '25px'
      }]
    }
  }
}
</script>

<style scoped>
img {
  max-width: initial;
}
@keyframes sent {
  0% {
    color:#28ba0e;
    transform: scale(1.2);
  }
  100% {
    color: rgba(0,0,0,.54);
    transform: scale(1);
  }
}
@keyframes received {
  0% {
    color:#4221a5;
    transform: scale(1.2);
  }
  100% {
    color: rgba(0,0,0,.54);
    transform: scale(1);
  }
}
.high_sent {
  animation: sent 1s;
}
.high_received {
  animation: received 1s;
}
.disconnect:hover {
  color: #e83333;
}
</style>
