const {EventEmitter} = require('events')
const net = require('net')

const STATE = {idle: Symbol('idle'), status: Symbol('status')}
let oldClients
class client extends EventEmitter {
  constructor(host, port) {
    super()
    this.state = STATE.idle
    this.host = host
    this.port = port
    this.alive = false
    this.clientRes = false
    this.clientProps = []
    this.clients = new Map()
    this.socket = new net.Socket()
    this.connected = false
    this.socket.on('data', (data) => {
      const items = data.toString().split('\r\n').filter(itm => itm.length)
      items.forEach(itm => this.procData(itm.toString()))
    })
    this.socket.on('error', () => {
      this.connected = false
      console.log('Could not connect to management console, retrying in 60s')
      setTimeout(() => this.connect(), 60 * 1000)
    })
    this.connect()
  }

  procData(data) {
    const prepProperty = (val) => {
      if (val.match(/^[0-9]+$/))
        return parseInt(val, 10)
      if (val === 'UNDEF')
        return undefined
      return val
    }

    if (data.startsWith('TITLE')) {
      oldClients = new Map(this.clients)
      this.clients = new Map()
      this.state = STATE.status
    } else if (data.startsWith('HEADER') && this.state === STATE.status) {
      const props = data.split('\t').slice(2, data.length + 1)
      this.clientProps = props
    } else if (data.startsWith('CLIENT_LIST') && this.state === STATE.status) {
      const props = data.split('\t').slice(1, data.length + 1)
      const vpnClient = {}
      this.clientProps.forEach((prop, idx) => vpnClient[prop] = prepProperty(props[idx]))
      if ((vpnClient['Common Name'] && vpnClient['Common Name'].length) || (vpnClient.Username && vpnClient.Username.length))
        this.clients.set(vpnClient['Client ID'], vpnClient)
    } else if (data.startsWith('ROUTING_TABLE') && this.state === STATE.status) {
      const props = data.split('\t').slice(1, data.length + 1)
      this.clients.forEach((vpnClient) => {
        if (vpnClient['Real Address'] === props[this.clientProps.indexOf('Real Address')])
          this.clientProps.forEach((prop, idx) => vpnClient[prop] = prepProperty(props[idx]))
      })
    } else if (data.startsWith('END') && this.state === STATE.status) {
      oldClients.forEach((vpnClient, clientId) => {
        if (!this.clients.has(clientId) && (vpnClient['Common Name'].length || vpnClient.Username.length))
          this.emit('client-disconnect', vpnClient)
      })
      if (this.clientRes) {
        this.clientRes(Array.from(this.clients.values()))
        this.clientRes = false
      }
      this.state = STATE.idle
    } else if (data.startsWith('>BYTECOUNT_CLI') && this.state === STATE.idle) {
      const [_, clientId, received, sent] = data.match(/>BYTECOUNT_CLI:([0-9]+),([0-9]+),([0-9]+)/).map(itm => parseInt(itm, 10))
      if (this.clients.has(clientId)) {
        const vpnClient = this.clients.get(clientId)
        vpnClient['Bytes Received'] = received
        vpnClient['Bytes Sent'] = sent
        this.emit('client-update', vpnClient)
      }
    } else if (data.startsWith('>CLIENT:ESTABLISHED') && this.state === STATE.idle) {
      const [_, clientId] = data.split(',').map(itm => parseInt(itm, 10))
      setTimeout(() => {
        this.getClients().then(() => {
          this.emit('client-connect', this.clients.get(clientId))
        })
      }, 2000)
    } else if (data.startsWith('>CLIENT:DISCONNECT') && this.state === STATE.idle) {
      const [_, clientId] = data.split(',').map(itm => parseInt(itm, 10))
      if (this.clients.has(clientId)) {
        this.emit('client-disconnect', this.clients.get(clientId))
        this.clients.delete(clientId)
      }
    }
  }

  connect() {
    this.connected = new Promise((resolve) => {
      this.socket.connect(this.port, this.host, () => {
        if (!this.alive)
          this.alive = setInterval(() => this.getClients(), 5000)
        this.socket.write('bytecount 5\r\n')
        resolve()
      })
    })
  }

  disconnect(cid) {
    const clt = this.clients.get(cid)
    if (!clt)
      return
    this.socket.write(`client-kill ${cid}`)
    this.emit('client-disconnect', clt)
  }

  getClients() {
    if (!this.connected)
      return
    return this.connected.then(() => {
      const res = new Promise(resolve => this.clientRes = resolve)
      this.socket.write('status 3\r\n')
      return res
    })
  }
}

module.exports = {
  OpenVPNclient: client
}
