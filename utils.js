const {CronJob} = require('cron')
const moment = require('moment')
const request = require('request')
const zlib = require('zlib')
const maxmind = require('maxmind')
const fs = require('fs')
const conf = require('nconf')

const log = (...args) => console.log(...[moment().format('HH:mm - DD.MM.YY'), ...args])

conf.file({file: 'cfg.json'})
conf.defaults({
  port: 3013,
  bind: '127.0.0.1',
  servers: [{
    name: 'Server', host: '127.0.0.1', man_port: 7656
  }],
  ipFile: './GeoLite2-City.mmdb',
  username: 'admin',
  password: 'admin',
  date_format: "HH:mm - DD.MM.YY"
})

const envVars = process.env
conf.set('username', envVars.AUTH_USERNAME || conf.get('username'))
conf.set('password', envVars.AUTH_PASSWORD || conf.get('password'))
if (envVars.VPN_NAME && envVars.VPN_HOST && envVars.VPN_MAN_PORT)
  conf.set('servers', [{name: envVars.VPN_NAME, host: envVars.VPN_HOST, man_port: envVars.VPN_MAN_PORT}])

const loadIPdatabase = () => {
  const ipFile = conf.get('ipFile')
  const loadFile = res => maxmind.open('./GeoLite2-City.mmdb', (err, lookup) => {
    if (err)
      log(err)
    else
      res(ip => (ip ? lookup.get(ip) : false))
  })
  return new Promise(resolve => {
    fs.stat(ipFile, (err, stat) => {
      const now = new Date().getTime()
      // Cached version to expire after a month from file date
      const expire = new Date((stat ? stat.ctime : '')).getTime() + 30 * 24 * 60 * 60 * 1000
      if (err || now > expire) {
        const req = request('https://geolite.maxmind.com/download/geoip/database/GeoLite2-City.mmdb.gz')
        req.on('response', resp => {
          if (resp.statusCode === 200)
            req.pipe(zlib.createGunzip()).pipe(fs.createWriteStream(ipFile))
              .on('finish', () => {
                loadFile(resolve)
              })
          else
            loadFile(resolve)
        })
      } else
        loadFile(resolve)
    })
  })
}

const _ = new CronJob({
  cronTime: '00 10 * 10 * *',
  onTick: loadIPdatabase,
  start: true
})

module.exports = {log, loadIPdatabase, conf}
