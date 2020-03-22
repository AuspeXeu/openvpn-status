<template>
  <v-container>
    <v-layout row v-resize="onResize">
      <div id="map" :style="mapDimenstions"/>
    </v-layout>
  </v-container>
</template>

<script>
import moment from 'moment'
import {mapState} from 'vuex'

export default {
  name: 'locations',
  watch: {
    mapDimenstions: {
      handler() {
        if (!this.map)
          setTimeout(() => {
            this.map = L.map('map')
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(this.map)
            const terminator = L.terminator().addTo(this.map)
            setInterval(() => terminator.setTime(), 10 * 1000)
            this.displayNodes(this.nodes)
          }, 1000)
      }
    },
    search() {
      this.displayNodes(this.nodes)
    },
    nodes(nodes) {
      this.displayNodes(nodes)
    }
  },
  methods: {
    displayNodes(nds) {
      const nodes = nds.filter(nd => nd.node.indexOf(this.search) !== -1)
      this.meta.forEach(marker => this.map.removeLayer(marker))
      if (!this.map || !nodes.length)
        return
      const points = nodes.map(node => L.latLng(node.lat, node.lon))
      this.map.fitBounds(points, {padding: [40, 40]})
      const clusters = nodes.reduce((acc, node) => {
        const point = L.latLng(node.lat, node.lon)
        const cluster = acc.find(cand => cand.point.distanceTo(point) <= 50 * 1000) // 50km
        if (cluster)
          cluster.nodes.push(node)
        else
          acc.push({point, nodes: [node]})
        return acc
      }, [])
      clusters.forEach(cluster => {
        const marker = L.marker(cluster.point)
        const txt = cluster.nodes.map(node => `<div><img src="${this.flagImg(node)}" alt="${this.flagTitle(node)}"/>${node.node}</div>`).join('')
        marker.bindPopup(`<div>${txt}</div>`)
        this.meta.push(marker)
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
      this.mapDimenstions = `height: ${window.innerHeight - 208}px;`
    }
  },
  computed: mapState({
    dateFormat: state => state.config.dateFormat,
    nodes: 'nodes',
    tab: 'tab',
    search: 'search'
  }),
  data() {
    return {
      meta: [],
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
