const zlib = require('zlib')
const fs = require('fs')
const express = require('express')
const app = express()
const conf = require('nconf')
const maxmind = require('maxmind')
const _ = require('lodash')
const process = require('child_process')
const moment = require('moment')
const request = require('request')
const CronJob = require('cron').CronJob
const log = console.log

conf.file({ file: 'config.json' })
app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use('/assets', express.static(__dirname + '/assets'))
const ipFile = conf.get('ipFile')
let cityLookup

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
          }
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
  res.render('home')
})

app.get('/updated', (req, res) => {
  const terminal = process.spawn('bash')
  terminal.stdout.on('data', (data) => {
    data = data.toString()
    const ary = data.split('\n')
    const lastUpdate = ary[1].split(',')[1]
    const obj = {
      success: true,
      value: lastUpdate
    }
    res.json(obj)
  })
  terminal.stdin.write('awk \'/OpenVPN/,/END/\' ' + conf.get('logFile'))
  terminal.stdin.end()
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

app.get('/entries', (req, res) => {
  const terminal = process.spawn('bash')
  terminal.stdout.on('data', (data) => {
    data = data.toString()
    const ary = data.split('\n')
    ary.shift()
    ary.pop()
    ary.pop()
    const entries = []
    _.each(ary, (entry) => {
      const split = entry.split(',')
      const itm = {
        vpn: split[0],
        name: split[1],
	      pub: split[2].split(':')[0],
        timestamp: moment(new Date(split[3])).unix()
      }
      entries.push(itm)
    })
    res.json(entries)
  })
  terminal.stdin.write('awk \'/Ref/,/GLOBAL/\' ' + conf.get('logFile'))
  terminal.stdin.end()
})

app.listen(conf.get('port'))
