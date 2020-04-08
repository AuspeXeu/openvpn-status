const {EventEmitter} = require('events')
const net = require('net')
const Netmask = require('netmask').Netmask

const mkClient = (data, original = {}) => {
  const candidate = {
    key: data['Common Name'] || data.Username || data['Client ID'],
    clientId: data['Client ID'],
    cn: data['Common Name'] || data.Username,
    connected: data['Connected Since (time_t)'],
    seen: data['Last Ref (time_t)'],
    pub: (data['Real Address'] || ':').split(':')[0],
    port: (data['Real Address'] || ':').split(':')[1],
    vpn: data['Virtual Address'],
    received: data['Bytes Received'],
    sent: data['Bytes Sent']
  }
  const patch = {}
  Object.keys(candidate).forEach((key) => {
    const type = typeof candidate[key]
    if (type === 'string') {
      candidate[key] = candidate[key].trim()
    }
    if (candidate[key] && ((type === 'string' && candidate[key].trim().length > 0) || type !== 'string')) {
      patch[key] = candidate[key]
    }
  })
  return Object.assign(original, patch)
}

const STATE = {idle: Symbol('idle'), status: Symbol('status')}
class client extends EventEmitter {
  constructor(host, port, pwd = null, netmask = null) {
    super()
    this.state = STATE.idle
    this.host = host
    this.port = port
    this.pwd = pwd
    this.netmask = new Netmask ('0.0.0.0/0')
    if (netmask != null) {
        try {
          const nm = new Netmask(netmask);
          this.netmask = nm;
        } catch (error) {
          console.log(`Could not parse netmask ${netmask}`);
          console.log(error);
        }
    }
    this.alive = false
    this.clientRes = false
    this.clientProps = []
    this.clients = new Map()
    this.oldClients = new Map()
    this.socket = new net.Socket()
    this.connected = false
    this.socket.on('data', data => {
      const items = data.toString().split('\r\n').filter(itm => itm.length)
      items.forEach(itm => {
        try {
          this.procData(itm.toString());
        } catch (error) {
          console.log(`Could not process data item ${itm.toString()}`);
          console.log(error);
        }});
    })
    this.socket.on('error', () => {
      this.connected = false
      console.log(`Could not connect to management console @ ${this.host}:${this.port}, retrying in 10s`)
      setTimeout(() => this.connect(), 10 * 1000)
    })
    this.connect()
  }

  procData(data) {
    const prepProperty = val => {
      if (!val)
        return undefined

      if (val.match(/^[0-9]+$/))
        return parseInt(val, 10)

      if (val === 'UNDEF')
        return undefined

      return val
    }

    if (data.startsWith('TITLE')) {
      this.oldClients = new Map(this.clients)
      this.clients = new Map()
      this.state = STATE.status
    } else if (data.startsWith('HEADER') && this.state === STATE.status) {
      const props = data.split('\t').slice(2, data.length + 1)
      this.clientProps = props
    } else if (data.startsWith('CLIENT_LIST') && this.state === STATE.status) {
      const props = data.split('\t').slice(1, data.length + 1)
      const vpnClient = {}
      this.clientProps.forEach((prop, idx) => vpnClient[prop] = prepProperty(props[idx]))
      const client = mkClient(vpnClient)
      if (client.key) {
        this.clients.set(client.key, client)
      }
    } else if (data.startsWith('ROUTING_TABLE') && this.state === STATE.status) {
      const props = data.split('\t').slice(1, data.length + 1)
      const realAddressIndex = this.clientProps.indexOf('Real Address');
      if (realAddressIndex < props.length) {
        const [pub, port] = props[realAddressIndex].split(':')
        const client = Array.from(this.clients.values()).find((client) => client.pub === pub && client.port === port && this.netmask.contains(client.pub))
        if (client) {
          const vpnClient = this.clientProps.reduce((acc, prop, idx) => {
            acc[prop] = prepProperty(props[idx])
            return acc
          }, {})
          mkClient(vpnClient, client)
        }
      } else {
         console.log(`props truncated ${data}`);
      }
    } else if (data.startsWith('END') && this.state === STATE.status) {
      this.oldClients.forEach((client, key) => {
        if (!this.clients.has(key))
          this.emit('client-disconnect', client)
      })
      this.clients.forEach((client, key) => {
        if (!this.oldClients.has(key)) {
          this.emit('client-connect', client)
          this.oldClients.set(key, client)
        }
      })
      if (this.clientRes) {
        this.clientRes(Array.from(this.clients.values()))
        this.clientRes = false
      }
      this.state = STATE.idle
    } else if (data.startsWith('>BYTECOUNT_CLI') && this.state === STATE.idle) {
      const [_, clientId, received, sent] = data.match(/>BYTECOUNT_CLI:([0-9]+),([0-9]+),([0-9]+)/).map(itm => parseInt(itm, 10))
      const client = Array.from(this.clients.values()).find((client) => client.clientId === clientId)
      if (client) {
        client.received = received
        client.sent = sent
        this.emit('client-update', client)
      }
    } else if (data.startsWith('>CLIENT:ESTABLISHED') && this.state === STATE.idle) {
      this.getClients()
    } else if (data.startsWith('>CLIENT:DISCONNECT') && this.state === STATE.idle) {
      this.getClients()
    }
  }

  connect() {
    this.connected = new Promise(resolve => {
      this.socket.connect(this.port, this.host, () => {
        if (this.pwd)
          this.socket.write(`${this.pwd}\r\n`)
        if (!this.alive)
          this.alive = setInterval(() => this.getClients(), 5000)

        this.socket.write('bytecount 5\r\n')
        console.log(`Connected to management console @ ${this.host}:${this.port}`)
        resolve()
      })
    })
  }

  disconnect(cid) {
    const client = Array.from(this.clients.values()).find((client) => client.clientId === cid)
    if (!client)
      return

    this.socket.write(`client-kill ${cid}`)
    this.emit('client-disconnect', client)
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

module.exports = client
