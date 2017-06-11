const zlib = require('zlib')
const fs = require('fs')
const express = require('express')
const app = express()
var expressWs = require('express-ws')(app)
const conf = require('nconf')
const maxmind = require('maxmind')
const moment = require('moment')
const request = require('request')
const uuid = require('uuid/v1')
const CronJob = require('cron').CronJob
const db = require('./database.js')
const log = console.log

conf.file({file: 'config.json'})
app.use('/static', express.static(__dirname + '/static'))
const ipFile = conf.get('ipFile')
let cityLookup
let servers = conf.get('servers') || []
servers.forEach((srv) => srv.clients = new Map())

if (conf.get('logFile'))
  log('The "logFile" option is no longer supported. Please specify the server as described at https://github.com/AuspeXeu/openvpn-status')

const logEvent = (server, name, event) => {
  const data = {server: server, node: name, event: event, timestamp: moment().unix()}
  servers[server].clients.forEach((ws) => ws.send(JSON.stringify(data)))
  db.Log.create(data)
}

const updateServer = (server) => {
  const content = fs.readFileSync(server.logFile, 'utf8').trim().split('\n')
  const rawEntries = content.map((line) => line.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+),([^,]+),([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):[0-9]+,([^,]+)/)).filter((itm) => itm)
  const entries = rawEntries.map((entry) => ({
    vpn: entry[1],
    name: entry[2],
    pub: entry[3],
    timestamp: moment(new Date(entry[4])).unix()
  })).filter((entry) => entry.name !== 'UNDEF')
  entries.forEach((newEntry) => {
    if (!server.entries.find((item) => item.name === newEntry.name))
      logEvent(server.id, newEntry.name, 'connect')
  })
  server.entries.forEach((oldEntry) => {
    if (!entries.find((item) => item.name === oldEntry.name))
      logEvent(server.id, oldEntry.name, 'disconnect')
  })
  server.entries = entries
  fs.writeFileSync('./state.json', JSON.stringify(servers), 'utf-8')
}

new CronJob({
  cronTime: '00 10 * 10 * *',
  onTick: () => {
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
                  cityLookup = lookup
                })
              })
          } else
            maxmind.open('./GeoLite2-City.mmdb', (err, lookup) => {
              if (err)
                log(err)
              cityLookup = lookup
            })
        })
      } else
        maxmind.open('./GeoLite2-City.mmdb', (err, lookup) => {
          if (err)
            log(err)
          cityLookup = lookup
        })
    })
  },
  runOnInit: true,
  start: true
})

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
app.get('/geoip/:ip', (req, res) => {
  const ip = req.params.ip
  if (maxmind.validate(ip)) {
    let city = cityLookup.get(ip)
    if (!city)
      city = {}
    city.ip = ip
    res.json(city)
  } else
    res.status(404).send('N/A')
})
app.get('/servers', (req, res) => res.json(servers.map((server, idx) => ({name: server.name, id: idx}))))
const compare = (a,b) => {
  if (a.pub < b.pub)
    return -1
  if (a.pub > b.pub)
    return 1
  return 0
}
app.get('/entries/:id', (req, res) => res.json(servers[req.params.id].entries.sort(compare)))
app.get('/log/:id/size', (req, res) => db.Log.count({where: {server: req.params.id}}).then((size) => res.json({value: size})))
app.get('/log/:id/:page/:size', (req, res) => {
  const page = parseInt(req.params.page, 10)
  const size = parseInt(req.params.size, 10)
  const query = db.Log.findAll({where: {server: req.params.id}, offset: (page - 1) * size, limit: size, order: 'timestamp DESC'})
  query.then((data) => {
    res.json(data.map((item) => ({server: item.server, node: item.node, timestamp: item.timestamp, event: item.event})))
  })
})
app.ws('/log/:id/live', (ws, req) => {
  const id = uuid()
  servers[req.params.id].clients.set(id, ws)
  ws.on('close', () => servers[req.params.id].clients.delete(id))
})

db.init().then(() => {
  fs.stat('./state.json', (err, stat) => {
    let state = []
    if (!err)
      state = JSON.parse(fs.readFileSync('./state.json', 'utf-8'))
    servers.forEach((server, idx) => {
      const oldState = state.find((item) => item.name === server.name)
      server.entries = (oldState ? oldState.entries : [])
      server.id = idx
      updateServer(server)
      fs.watchFile(server.logFile, () => updateServer(server))
    })
    app.listen(conf.get('port'))
  })
})
