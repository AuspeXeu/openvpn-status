const zlib = require('zlib')
const fs = require('fs')
const express = require('express')
const app = express()
const expressWs = require('express-ws')(app)
const conf = require('nconf')
const maxmind = require('maxmind')
const moment = require('moment')
const request = require('request')
const uuid = require('uuid/v1')
const CronJob = require('cron').CronJob
const db = require('./database.js')
const log = console.log

conf.file({file: 'config.json'})
conf.defaults({
  port: 3013,
  bind: '127.0.0.1',
  ipFile: './GeoLite2-City.mmdb'
})
app.use('/static', express.static(__dirname + '/static'))
const ipFile = conf.get('ipFile')
let cityLookup
const clients = new Map()
let servers = conf.get('servers') || []
servers.forEach((server) => server.regex = getRegex(server.logFile))

if (conf.get('logFile'))
  log('The "logFile" option is no longer supported. Please specify the server as described at https://github.com/AuspeXeu/openvpn-status')

const logEvent = (server, name, event) => {
  const data = {server: server, node: name, event: event, timestamp: moment().unix()}
  clients.forEach((ws) => ws.send(JSON.stringify(data)))
  db.Log.create(data)
}

function getRegex (logFile) {
  const content = fs.readFileSync(logFile, 'utf8').trim().split('\n')
  const logFormatLine = content.find((line) => line.startsWith("HEADER,CLIENT_LIST"))
  if (logFormatLine === undefined) {
    // There is no format line -> return the regex used on debian
    return  new RegExp('([[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+]|[^,\t]+)[,\t]([^(,\t)]+)[,\t]([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):[0-9]+[,\t]([^(,\t)]+)')
  } else {
    //parse the Header line and construct regex
    const IPv4_uncaptured = "(?:(?:[01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5]])\.(?:[01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.(?:[01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5])\.(?:[01]?[0-9]?[0-9]|2[0-4][0-9]|25[0-5]))"
    const IPv6_uncaptured = "(?:[\[])(?:(?:[0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))(?:[\]])"
    const IPv4_captured = "(" + IPv4_uncaptured + ")"
    const IPv6_captured = "(" + IPv6_uncaptured + ")"
    const IPv4_or_IPv6_captured = "(" + IPv6_uncaptured + "|" + IPv4_uncaptured + ")"
    const IPv4_or_IPv6_captured_with_port = IPv4_or_IPv6_captured + ":[0-9]{1,5}"
    const common_name_captured = "([a-zA-Z]+)"
    const connected_since_captured = '(.*)'
    regexString = ""
    formatEntries = logFormatLine.split(",")
    formatEntries.forEach((field) => {
      switch(field) {
        case "HEADER":
          break;
        case "CLIENT_LIST":
          regexString += "^CLIENT_LIST,";
          break;
        case "Common Name":
          regexString += common_name_captured + ",";
          break;
        case 'Real Address':
          regexString += IPv4_or_IPv6_captured_with_port + ",";
          break;
        case 'Virtual Address':
          regexString += IPv4_captured + ',';
          break;
        case 'Virtual IPv6 Address':
          regexString += IPv6_captured + '{0,1},';
          break;
        case 'Connected Since':
          regexString += connected_since_captured + ',';
          break;
        default:
          regexString += '.*,'
      }
    })
    regexString = regexString.replace(/.$/,"$")
    return new RegExp(regexString)
  }
}

const updateServer = (server) => {
  const content = fs.readFileSync(server.logFile, 'utf8').trim().split('\n')
  const rawEntries = content.map((line) => line.match(server.regex)).filter((itm) => itm)
  const entries = rawEntries.map((entry) => ({
    //TODO: per server matching depending on regex
    //TODO: support for debian style log
    name: entry[1],
    pub: entry[2],
    vpn: entry[3],
    vpn_ipv6: entry[4],
    timestamp: moment(new Date(entry[5])).unix()
  })).filter((entry) => entry.name !== 'UNDEF')
  entries.forEach((newEntry) => {
    const loc = cityLookup.get(newEntry.pub)
    if (loc) {
      newEntry.country_code = loc.country.iso_code
      newEntry.country_name = loc.country.names.en
    }
    db.Log.findOne({where: {server: server.id, node: newEntry.name}, order: [['timestamp', 'DESC']]})
      .then((res) => {
        if (!res || res.event === 'disconnect')
          logEvent(server.id, newEntry.name, 'connect')
      })
  })
  server.entries.forEach((oldEntry) => {
    if (!entries.find((item) => item.name === oldEntry.name))
      logEvent(server.id, oldEntry.name, 'disconnect')
  })
  server.entries = entries
}

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
                  cityLookup = lookup
                  resolve(cityLookup)
                })
              })
          } else
            maxmind.open('./GeoLite2-City.mmdb', (err, lookup) => {
              if (err)
                log(err)
              cityLookup = lookup
              resolve(cityLookup)
            })
        })
      } else
        maxmind.open('./GeoLite2-City.mmdb', (err, lookup) => {
          if (err)
            log(err)
          cityLookup = lookup
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

app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'))
app.get('/servers', (req, res) => res.json(servers.map((server, idx) => ({name: server.name, id: idx}))))
const compare = (a,b) => {
  if (a.country_code < b.country_code)
    return -1
  if (a.country_code > b.country_code)
    return 1
  if (a.pub < b.pub)
    return -1
  if (a.pub > b.pub)
    return 1
  if (a.timestamp < b.timestamp)
    return 1
  if (a.timestamp > b.timestamp)
    return -1
  return 0
}
app.get('/entries/:id', (req, res) => res.json(servers[req.params.id].entries.sort(compare)))
app.get('/log/:id/size', (req, res) => db.Log.count({where: {server: req.params.id}}).then((size) => res.json({value: size})))
app.get('/log/:id/:page/:size', (req, res) => {
  const page = parseInt(req.params.page, 10)
  const size = parseInt(req.params.size, 10)
  const query = db.Log.findAll({where: {server: req.params.id}, offset: (page - 1) * size, limit: size, order: [['timestamp', 'DESC']]})
  query.then((data) => {
    res.json(data.map((item) => ({server: item.server, node: item.node, timestamp: item.timestamp, event: item.event})))
  })
})
app.ws('/live/log', (ws, req) => {
  const id = uuid()
  clients.set(id, ws)
  ws.on('close', () => clients.delete(id))
})

db.init().then(() => {
  db.state().then((entries) => {
    loadIPdatabase().then(() => {
      servers.forEach((server, idx) => {
        server.entries = entries.filter((entry) => entry.server === idx).map((entry) => ({
          name: entry.node,
          timestamp: entry.timestamp
        }))
        server.id = idx
        updateServer(server)
        fs.watchFile(server.logFile, () => updateServer(server))
      })
      app.listen(conf.get('port'), conf.get('bind'))
    })
  })
})
