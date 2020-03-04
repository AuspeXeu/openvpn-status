<template>
  <v-container>
    <v-data-table
      :headers="headers"
      :items="nodes"
      :search="search"
      hide-default-footer
      :custom-sort="customSort"
      :items-per-page="-1"
      class="elevation-1"
      :loading="loading">
      <template #item.country_name="{item}">
        <v-tooltip right>
          <template #activator="{on}">
            <img v-on="on" :src="flagImg(item)"/>
          </template>
          <span>{{ flagTitle(item) }}</span>
        </v-tooltip>
      </template>
      <template #item.pub="{value}">
        <a :href="`http://geoiplookup.net/ip/${value}`" target="_blank">{{ value }}</a>
      </template>
      <template #item.connected="{item}">
        <v-tooltip bottom>
          <template #activator="{on}">
            <span v-on="on">{{ formatTime(item.connected) }}</span>
          </template>
          <span>Last seen: {{ elabsedTime(item.seen) }}</span><br>
          <span>Online: {{ elabsedTime(item.connected) }}</span>
        </v-tooltip>
      </template>
      <template #item.traffic="{item}">
        <v-tooltip top>
          <template #activator="{on}">
            <v-icon :id="`${item.node}_sent`" v-on="on">fa-arrow-up</v-icon>
          </template>
          <span>{{ formatDataVolume(item.sent) }} sent</span>
        </v-tooltip>
        <v-tooltip bottom>
          <template #activator="{on}">
            <v-icon :id="`${item.node}_received`" v-on="on">fa-arrow-down</v-icon>
          </template>
          <span>{{ formatDataVolume(item.received) }} received</span>
        </v-tooltip>
      </template>
      <template #item.action="{item}">
        <v-tooltip left>
          <template #activator="{on}">
            <v-icon v-on="on" class="disconnect" style="cursor:pointer;" @click="disconnect(item.clientId)">fa-skull</v-icon>
          </template>
          <span>Disconnect client</span>
        </v-tooltip>
      </template>
    </v-data-table>
  </v-container>
</template>

<script>
import moment from 'moment'
import axios from 'axios'
import {mapState} from 'vuex'
import store from '../store'

export default {
  name: 'clients',
  methods: {
    customSort(items, [col], [isDesc]) {
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
  mounted() {
    store.dispatch('loadClients')
  },
  computed: {
    ...mapState({
      dateFormat: state => state.config.dateFormat,
      severId: 'server',
      loading: 'clientsLoading'
    }),
    ...mapState(['updateNode', 'search', 'nodes'])
  },
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
        value: 'traffic',
        width: '100px'
      }, {
        text: 'Action',
        sortable: false,
        value: 'action',
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
