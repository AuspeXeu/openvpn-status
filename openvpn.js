const EventEmitter = require('events').EventEmitter
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
    this.connected = new Promise((resolve) => {
      this.socket.connect(this.port, this.host, () => {
        this.socket.write('bytecount 5\r\n')
        resolve()
      })
    })
    this.socket.on('data', (data) => {
      data = data.toString().split('\r\n').filter((itm) => itm.length)
      data.forEach((itm) => this.procData(itm))
    })
  }
  procData(data) {
    const prepProperty = (data) => {
      if (data.match(/^[0-9]+$/))
        return parseInt(data, 10)
      else if (data === 'UNDEF')
        return undefined
      else
        return data
    }

    data = data.toString()
    if (data.startsWith('TITLE')) {
      oldClients = new Map(this.clients)
      this.clients = new Map()
      this.state = STATE.status
    } else if (data.startsWith('HEADER') && this.state === STATE.status) {
      data = data.split('\t').slice(2, data.length+1)
      this.clientProps = data
    } else if (data.startsWith('CLIENT_LIST') && this.state === STATE.status) {
      data = data.split('\t').slice(1, data.length+1)
      const client = {}
      this.clientProps.forEach((prop, idx) => client[prop] = prepProperty(data[idx]))
      this.clients.set(client['Client ID'], client)
    } else if (data.startsWith('ROUTING_TABLE') && this.state === STATE.status) {
      data = data.split('\t').slice(1, data.length+1)
      this.clients.forEach((client) => {
        if (client['Real Address'] === data[this.clientProps.indexOf('Real Address')])
          this.clientProps.forEach((prop, idx) => client[prop] = prepProperty(data[idx]))
      })
    } else if (data.startsWith('END') && this.state === STATE.status) {
      oldClients.forEach((client, clientId) => {
        if (!this.clients.has(clientId) && (client['Common Name'].length || client['Username'].length))
          this.emit('client-disconnect', client)
      })
      if (this.clientRes) {
        this.clientRes(Array.from(this.clients.values()))
        this.clientRes = false
      }
      this.state = STATE.idle
    } else if (data.startsWith('>BYTECOUNT_CLI') && this.state === STATE.idle) {
      const [_, clientId, received, sent] = data.match(/>BYTECOUNT_CLI:([0-9]+),([0-9]+),([0-9]+)/).map((itm) => parseInt(itm, 10))
      if (this.clients.has(clientId)) {
        const client = this.clients.get(clientId)
        client['Bytes Received'] = received
        client['Bytes Sent'] = sent
        this.emit('client-update', client)
      }
    } else if (data.startsWith('>CLIENT:ESTABLISHED') && this.state === STATE.idle) {
      const [_, clientId] = data.split(',').map((itm) => parseInt(itm, 10))
      this.getClients().then((clients) => {
        this.emit('client-connect', this.clients.get(clientId))
      })
    } else if (data.startsWith('>CLIENT:DISCONNECT') && this.state === STATE.idle) {
      const [_, clientId] = data.split(',').map((itm) => parseInt(itm, 10))
      if (this.clients.has(clientId)) {
        this.emit('client-disconnect', this.clients.get(clientId))
        this.clients.delete(clientId)
      }
    }
  }
  connect() {
    return this.connected
  }
  getClients() {
    if (!this.alive)
      this.alive = setInterval(() => this.getClients(), 5000)
    return this.connected.then(() => {
      const res = new Promise((resolve) => this.clientRes = resolve)
      this.socket.write('status 3\r\n')
      return res
    })
  }
}

module.exports = {
  OpenVPNclient: client
}
