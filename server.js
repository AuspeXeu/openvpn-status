const http = require('http')
const express = require('express')
const WebSocket = require('ws')
const bodyParser = require('body-parser')
const moment = require('moment')
const uuid = require('uuid/v1')

const app = express()
const {log, conf, loadIPdatabase} = require('./utils.js')
const openvpn = require('./openvpn.js')
const db = require('./database.js')

// HTTP authentication
if (conf.get('username') && conf.get('username').length)
  app.use((req, res, next) => {
    // Parse login and password from headers
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')
    // Verify login and password are set and correct
    if (!login || !password || login !== conf.get('username') || password !== conf.get('password')) {
      res.set('WWW-Authenticate', 'Basic realm="401"')
      res.status(401).send('Authentication required.')
    } else
      next()
  })

app.get('/', (req, res) => res.sendFile(`${__dirname}/dist/index.html`))
app.use('/', express.static(`${__dirname}/dist`))
app.use(bodyParser.json())

let cityLookup
const clients = new Map()
const servers = conf.get('servers') || []
const broadcast = data => clients.forEach(ws => ws.send(JSON.stringify(data)))
const logEvent = data => {
  const ts = data.timestamp % 60
  db.Log.findOne({
    where: {
      server: data.server,
      node: data.node,
      timestamp: {[db.op.between]: [data.timestamp - ts, data.timestamp + 60 - ts]}
    }
  })
    .then(entry => {
      if (entry && servers[data.server].entries.find(cl => cl.cid === data.cid)) {
        Object.assign(entry, data)
        entry.event = 'reconnect'
        entry.save().then(() => broadcast(entry))
      } else
        db.Log.create(data).then(nEntry => broadcast(Object.assign(nEntry, data)))
    })
}
const clientToEntry = client => {
  const obj = {
    cid: client['Client ID'],
    node: client['Common Name'] || client.Username,
    connected: client['Connected Since (time_t)'],
    seen: client['Last Ref (time_t)'],
    pub: client['Real Address'].split(':')[0],
    vpn: client['Virtual Address'],
    received: client['Bytes Received'],
    sent: client['Bytes Sent']
  }
  const loc = cityLookup(obj.pub)
  if (loc) {
    obj.country_code = loc.country.iso_code
    obj.country_name = loc.country.names.en
  }
  return obj
}

const validateNumber = n => Number.isFinite(parseFloat(n, 10))

app.get('/servers', (req, res) => res.json(servers.map((server, idx) => ({name: server.name, id: idx}))))

const validateServer = (req, res, next) => {
  const serverId = req.params.id || req.params[0]
  if (!validateNumber(serverId))
    return res.sendStatus(400)
  if (!servers[serverId])
    return res.sendStatus(404)
  next()
}
app.post('/server/:id/disconnect/:cid', validateServer, (req, res) => {
  if (!validateNumber(req.params.cid))
    return res.sendStatus(400)
  const cid = parseInt(req.params.cid, 10)
  servers[req.params.id].vpnclient.disconnect(cid)
  res.sendStatus(200)
})
app.get('/entries/:id', validateServer, (req, res) => {
  const customSort = items => {
    if (!items)
      return []
    const keys = new Map()
    items.forEach(itm => keys.set(itm.node, `${itm.country_name}${itm.node}${itm.pub}`))
    items.sort((a, b) => {
      if (keys.get(a.node) < keys.get(b.node))
        return -1
      if (keys.get(a.node) > keys.get(b.node))
        return 1
      return 0
    })
    return items
  }
  res.json(customSort(servers[req.params.id].entries))
})
// /log/:id/size/:search
app.get(/\/log\/([0-9]*)\/size\/(.*)/, validateServer, (req, res) => {
  const needle = `%${(req.params[1].trim() || '')}%`
  db.Log.count({
    where: {
      server: req.params[0], node: {[db.op.like]: needle}
    }
  }).then(size => res.json({value: size}))
})
// /log/:id/:page/:size/:search
app.get(/\/log\/([0-9]*)\/([0-9]*)\/([-0-9]*)\/(.*)/, validateServer, (req, res) => {
  if (!validateNumber(req.params[1]) || !validateNumber(req.params[2]))
    return res.sendStatus(400)
  const needle = `%${(req.params[3].trim() || '')}%`
  const page = parseInt(req.params[1], 10)
  const size = parseInt(req.params[2], 10)
  const query = db.Log.findAll({
    where: {server: req.params[0], node: {[db.op.like]: needle}}, offset: (page - 1) * size, limit: size, order: [['timestamp', 'DESC']]
  })
  query.then(data => res.json(data))
})

const httpServer = http.createServer(app)
const wss = new WebSocket.Server({server: httpServer})

wss.on('connection', ws => {
  const id = uuid()
  clients.set(id, ws)
  ws.on('close', () => clients.delete(id))
  ws.on('error', err => {
    log(err)
    clients.delete(id)
  })
})

Promise.all([loadIPdatabase(), db.init()]).then(results => {
  [cityLookup] = results
  servers.forEach((server, idx) => {
    const client = new openvpn.OpenVPNclient(server.host, server.man_port)
    client.getClients().then(clts => server.entries = clts.map(clientToEntry))
    client.on('client-connect', cl => {
      const entry = clientToEntry(cl)
      server.entries = server.entries.filter(itm => itm.node !== entry.node)
      logEvent(Object.assign({server: idx, event: 'connect', timestamp: moment().unix()}, entry))
      server.entries.push(entry)
    })
    client.on('client-disconnect', cl => {
      const entry = Object.assign(clientToEntry(cl), {event: 'disconnect'})
      const oLen = server.entries.length
      server.entries = server.entries.filter(itm => itm.node !== entry.node)
      if (oLen !== server.entries.length)
        logEvent(Object.assign({server: idx, event: 'disconnect', timestamp: moment().unix()}, entry))
    })
    client.on('client-update', cl => {
      broadcast(Object.assign(clientToEntry(cl), {server: idx, event: 'update', timestamp: moment().unix()}))
    })
    server.vpnclient = client
  })
  httpServer.listen({host: conf.get('bind'), port: conf.get('port'), exclusive: true})
})
