const zlib = require('zlib')
const fs = require('fs')
const http = require('http')
const openvpn = require('./openvpn.js')
const express = require('express')
const app = express()
const WebSocket = require('ws')
const conf = require('nconf')
const bodyParser = require('body-parser')
const maxmind = require('maxmind')
const moment = require('moment')
const request = require('request')
const uuid = require('uuid/v1')
const CronJob = require('cron').CronJob
const db = require('./database.js')
const log = (...args) => console.log(...[moment().format('HH:mm - DD.MM.YY'), ...args])

conf.file({file: 'cfg.json'})
conf.defaults({
  port: 3013,
  bind: '127.0.0.1',
  servers: [{id: 0, name: 'Server', host: '127.0.0.1', man_port: 7656}],
  ipFile: './GeoLite2-City.mmdb',
  username: 'admin',
  password: 'admin'
})
app.use('/static', express.static(`${__dirname}/dist/static`))
app.use(bodyParser.json())
//HTTP authentication
if (conf.get('username') && conf.get('username').length)
  app.use((req, res, next) => {
    // Parse login and password from headers
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const [login, password] = new Buffer(b64auth, 'base64').toString().split(':')
    // Verify login and password are set and correct
    if (!login || !password || login !== conf.get('username') || password !== conf.get('password')) {
      res.set('WWW-Authenticate', 'Basic realm="401"')
      return res.status(401).send('Authentication required.')
    }
    next()
  })
const ipFile = conf.get('ipFile')
const cityLookup = {}
const clients = new Map()
let servers = conf.get('servers') || []

const broadcast = (data) => clients.forEach((ws) => ws.send(JSON.stringify(data)))
const logEvent = (data) => {
  db.Log.findOne({where: {server: data.server, node: data.node, timestamp: {[db.op.between]: [data.timestamp - 30, data.timestamp + 30]}}})
    .then((entry) => {
      if (entry && data.event === 'connect') {
        Object.assign(entry, data)
        entry.event = 'reconnect'
        entry.save().then(() => broadcast(entry))
      } else
        db.Log.create(data).then((entry) => broadcast(entry))
    })
}
const clientToEntry = (client) => ({
  node: client['Common Name'] || client['Username'],
  connected: client['Connected Since (time_t)'],
  timestamp: client['Last Ref (time_t)'],
  pub: client['Real Address'].split(':')[0],
  vpn: client['Virtual Address'],
  received: client['Bytes Received'],
  sent: client['Bytes Sent']
})
const validateIPaddress = (ipaddress) => /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress.toString())
const validateNumber = (n) => !isNaN(parseFloat(n)) && isFinite(n)
const loadIPdatabase = () => {
  return new Promise((resolve) => {
    fs.stat(ipFile, (err, stat) => {
      const now = new Date().getTime()
      //Cached version to expire after a month from file date
      const expire = new Date((stat ? stat.ctime : '')).getTime() + 30 * 24 * 60 * 60 * 1000
      if (err || now > expire) {
        const req = request('http://geolite.maxmind.com/download/geoip/database/GeoLite2-City.mmdb.gz')
        req.on('response', (resp) => {
          if(resp.statusCode === 200) {
            req.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(ipFile))
              .on('finish', () => {
                maxmind.open('./GeoLite2-City.mmdb', (err, lookup) => {
                  cityLookup.get = (ip) => (ip ? lookup.get(ip) : false)
                  resolve(cityLookup)
                })
              })
          } else
            maxmind.open('./GeoLite2-City.mmdb', (err, lookup) => {
              if (err)
                log(err)
              cityLookup.get = (ip) => (ip ? lookup.get(ip) : false)
              resolve(cityLookup)
            })
        })
      } else
        maxmind.open('./GeoLite2-City.mmdb', (err, lookup) => {
          if (err)
            log(err)
          cityLookup.get = (ip) => (ip ? lookup.get(ip) : false)
          resolve(cityLookup)
        })
    })
  })
}

new CronJob({
  cronTime: '00 10 * 10 * *',
  onTick: loadIPdatabase,
  start: true
})

app.get('/', (req, res) => res.sendFile(`${__dirname}/dist/index.html`))
app.get('/servers', (req, res) => res.json(servers.map((server, idx) => ({name: server.name, id: idx}))))
const validateServer = (req, res, next) => {
  const serverId = req.params.id || req.params[0]
  if (!validateNumber(serverId))
    return res.sendStatus(400)
  if (!servers[serverId])
    return res.sendStatus(404)
  next()
}
app.get('/country/:ip', (req, res) => {
  if (!validateIPaddress(req.params.ip))
    return res.sendStatus(400)
  const loc = cityLookup.get(req.params.ip)
  let geo = {}
  if (loc) {
    geo.country_code = loc.country.iso_code
    geo.country_name = loc.country.names.en
  }
  res.json(geo)
})
app.get('/entries/:id', validateServer, (req, res) => res.json(servers[req.params.id].entries))
// /log/:id/size/:search
app.get(/\/log\/([0-9]*)\/size\/(.*)/, validateServer, (req, res) => {
  const needle = `%${(req.params[1].trim() || '')}%`
  db.Log.count({where: {server: req.params[0], node: {[db.op.like]: needle}}}).then((size) => res.json({value: size}))
})
// /log/:id/:page/:size/:search
app.get(/\/log\/([0-9]*)\/([0-9]*)\/([-0-9]*)\/(.*)/, validateServer, (req, res) => {
  if (!validateNumber(req.params[1]) || !validateNumber(req.params[2]))
    return res.sendStatus(400)
  const needle = `%${(req.params[3].trim() || '')}%`
  const page = parseInt(req.params[1], 10)
  const size = parseInt(req.params[2], 10)
  const query = db.Log.findAll({where: {server: req.params[0], node: {[db.op.like]: needle}}, offset: (page - 1) * size, limit: size, order: [['timestamp', 'DESC']]})
  query.then((data) => res.json(data))
})

const server = http.createServer(app)
const wss = new WebSocket.Server({server})

wss.on('connection', (ws) => {
  const id = uuid()
  clients.set(id, ws)
  ws.on('close', () => clients.delete(id))
  ws.on('error', (err) => {
    log(err)
    clients.delete(id)
  })
})

db.init().then(() => {
  loadIPdatabase().then(() => {
    servers.forEach((server, idx) => {
      const client = new openvpn.OpenVPNclient(server.host, server.man_port)
      client.getClients().then((clients) => {
        server.entries = clients.map(clientToEntry)
      })
      client.on('client-connect', (client) => {
        const entry = clientToEntry(client)
        server.entries = server.entries.filter((itm) => itm.node !== entry.node)
        logEvent(Object.assign({server: idx, event: 'connect'}, entry))
        server.entries.push(entry)
      })
      client.on('client-disconnect', (client) => {
        const entry = Object.assign(clientToEntry(client), {event: 'disconnect'})
        const oLen = server.entries.length
        server.entries = server.entries.filter((itm) => itm.node !== entry.node)
        if (oLen !== server.entries.length)
          logEvent(Object.assign({server: idx, event: 'disconnect'}, entry))
      })
      client.on('client-update', (client) => broadcast(Object.assign(clientToEntry(client), {server:idx, event: 'update', timestamp: moment().unix()})))
    })
    server.listen({host: conf.get('bind'),port: conf.get('port'),exclusive: true})
  })
})
