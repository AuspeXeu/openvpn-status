const zlib = require('zlib')
const fs = require('fs')
const express = require('express')
const app = express()
const conf = require('nconf')
const maxmind = require('maxmind')
const moment = require('moment')
const request = require('request')
const CronJob = require('cron').CronJob
const log = console.log

conf.file({file: 'config.json'})
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use('/assets', express.static(__dirname + '/assets'))
const ipFile = conf.get('ipFile')
let cityLookup
let servers = conf.get('servers') || []

if (conf.get('logFile'))
  servers.push({name: 'unnamed', logFile: conf.get('logFile')})

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

app.get('/', (req, res) => {
  res.render('home', {servers: servers.map((server) => ({name: server.name}))})
})

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

app.get('/entries/:idx', (req, res) => {
  const content = fs.readFileSync(servers[req.params.idx].logFile, 'utf8').trim().split('\n')
  const rawEntries = content.map((line) => line.match(/([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+),([^,]+),([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):[0-9]+,([^,]+)/)).filter((itm) => itm)
  const entries = rawEntries.map((entry) => ({
    vpn: entry[1],
    name: entry[2],
    pub: entry[3],
    timestamp: moment(new Date(entry[4])).unix()
  })).filter((entry) => entry.name !== 'UNDEF')
  res.json(entries)
})

app.listen(conf.get('port'))
