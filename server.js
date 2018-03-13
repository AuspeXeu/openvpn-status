const zlib = require('zlib')
const fs = require('fs')
const http = require('http')
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
const log = console.log

conf.file({file: 'cfg.json'})
conf.defaults({
  port: 3013,
  bind: '127.0.0.1',
  servers: [{id: 0, name: 'Server'}],
  ipFile: './GeoLite2-City.mmdb'
})
app.use('/static', express.static(`${__dirname}/dist/static`))
app.use(bodyParser.json())
const ipFile = conf.get('ipFile')
const cityLookup = {}
const clients = new Map()
let servers = conf.get('servers') || []

const logBuffer = {}
const logEvent = (server, data, event) => {
  const record = {server: server, node: data.name, event: event, timestamp: moment().unix()}
  if (event === 'connect') {
    record.pub = data.pub
    record.vpn = data.vpn
    record.country_code = data.country_code
    record.country_name = data.country_name
  }
  if (!logBuffer[data.name])
    logBuffer[data.name] = setTimeout(() => {
      logBuffer[data.name] = false
      clients.forEach((ws) => ws.send(JSON.stringify(record)))
      db.Log.create(record)
    }, 1500)
  else {
    clearTimeout(logBuffer[data.name])
    logBuffer[data.name] = false
  }
}
const validateIPaddress = (ipaddress) => /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress.toString())
const validateNumber = (n) => !isNaN(parseFloat(n)) && isFinite(n)
const loadIPdatabase = () => {
  return new Promise((resolve) => {
    fs.stat(ipFile, (err, stat) => {
      const now = new Date().getTime()
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
  if (!validateNumber(req.params.id))
    return res.sendStatus(400)
  if (!servers[req.params.id])
    return res.sendStatus(404)
  next()
}
app.post('/server/:id/connect', validateServer, (req, res) => {
  const serverId = parseInt(req.params.id, 10)
  const pub = req.body.pub
  const cn = (req.body.cn || '').trim()
  const vpn = req.body.vpn
  if (!validateIPaddress(pub) || !validateIPaddress(vpn) || !cn.length)
    return res.sendStatus(400)
  const loc = cityLookup.get(pub)
  const entry = {name: cn, pub: pub, vpn: vpn, timestamp: moment().unix()}
  if (loc) {
    entry.country_code = loc.country.iso_code
    entry.country_name = loc.country.names.en
  }
  logEvent(serverId, entry, 'connect')
  servers[serverId].entries.push(entry)
  res.sendStatus(200)
})
app.post('/server/:id/disconnect', validateServer, (req, res) => {
  const serverId = parseInt(req.params.id, 10)
  const cn = (req.body.cn || '').trim()
  if (!cn.length)
    return res.sendStatus(400)
  logEvent(serverId, {name: cn}, 'disconnect')
  servers[serverId].entries = servers[serverId].entries.filter((itm) => itm.name !== cn)
  res.sendStatus(200)
})
app.get('/entries/:id', validateServer, (req, res) => res.json(servers[req.params.id].entries))
app.get('/log/:id/size/:search', validateServer, (req, res) => {
  const needle = `%${(req.params.search.trim() || '')}%`
  db.Log.count({where: {server: req.params.id, node {[db.op.like]: needle}}}).then((size) => res.json({value: size}))
})
app.get('/log/:id/:page/:size/:search', validateServer, (req, res) => {
  if (!validateNumber(req.params.page) || !validateNumber(req.params.size))
    return res.sendStatus(400)
  const needle = `%${(req.params.search.trim() || '')}%`
  const page = parseInt(req.params.page, 10)
  const size = parseInt(req.params.size, 10)
  const query = db.Log.findAll({where: {server: req.params.id, node: {[db.op.like]: needle}}, offset: (page - 1) * size, limit: size, order: [['timestamp', 'DESC']]})
  query.then((data) => {
    res.json(data.map((item) => ({server: item.server, node: item.node, timestamp: item.timestamp, event: item.event})))
  })
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

db.init().then(() => db.state()).then((entries) => {
  loadIPdatabase().then(() => {
    servers.forEach((server, idx) => {
      server.entries = entries.filter((entry) => entry.server === idx).map((entry) => {
        const data = {
          name: entry.node,
          timestamp: entry.timestamp,
          pub: entry.pub,
          vpn: entry.vpn
        }
        const loc = cityLookup.get(entry.pub)
        if (entry.pub && loc) {
          data.country_code = loc.country.iso_code
          data.country_name = loc.country.names.en
        }
        return data
      })
    })
    server.listen({host: conf.get('bind'),port: conf.get('port'),exclusive: true})
  })
})
