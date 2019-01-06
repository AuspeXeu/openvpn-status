<template>
  <v-container>
    <v-layout row v-resize="onResize">
      <div id="map" :style="mapDimenstions"></div>
    </v-layout>
  </v-container>
</template>

<script>
import moment from 'moment'
import {mapState} from 'vuex'

export default {
  name: 'locations',
  mounted() {
    this.onResize()
  },
  watch: {
    tab(nVal) {
      if (nVal === 'tab-2' && !this.map)
        setTimeout(() => {
          this.map = L.map('map')
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          }).addTo(this.map)
          this.displayNodes(this.nodes)
        }, 1000)
    },
    nodes(nVal, oVal) {
      if (!this.map || !nVal.length)
        return
      const exited = oVal.filter(node => !nVal.find(nNode => nNode.cid === node.cid))
      const entered = nVal.filter(node => !oVal.find(oNode => oNode.cid === node.cid))
      this.displayNodes(entered)
      exited.forEach(node => {
        this.map.removeLayer(this.meta[node.cid])
        delete this.meta[node.cid]
      })
    }
  },
  methods: {
    displayNodes(nodes) {
      const points = nodes.map(node => L.latLng(node.lat, node.lon))
      this.map.fitBounds(points)
      nodes.forEach(node => {
        const marker = L.marker([node.lat, node.lon])
        marker.bindPopup(`<img src="${this.flagImg(node)}" alt="${this.flagTitle(node)}"/>${node.node}`)
        this.meta[node.cid] = marker
        marker.addTo(this.map)
      })
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
    onResize() {
      this.mapDimenstions = `height: ${window.innerHeight - 183}px;`
    }
  },
  computed: mapState({
    dateFormat: state => state.config.dateFormat,
    nodes: 'nodes',
    tab: 'tab'
  }),
  data() {
    return {
      meta: {},
      mapDimenstions: ''
    }
  }
}
</script>

<style scoped>
#map {
  width: 100%;
}
</style>
