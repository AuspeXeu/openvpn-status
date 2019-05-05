const {CronJob} = require('cron')
const moment = require('moment')
const request = require('request')
const zlib = require('zlib')
const maxmind = require('maxmind')
const fs = require('fs')
const conf = require('nconf')
const os = require('os')
const path = require('path')

conf.file({file: './conf/cfg.json'})
conf.defaults({
  port: 3013,
  bind: '127.0.0.1',
  servers: [{
    name: 'Server', host: '127.0.0.1', man_port: 7656
  }],
  username: 'admin',
  password: 'admin',
  web: {
    dateFormat: 'HH:mm:ss - DD.MM.YY'
  }
})

if (!conf.get('ipFile')) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'openvpn-status-'))
  if (dir)
    conf.set('ipFile', path.join(dir, 'GeoLite2-City.mmdb'))
  else
    conf.set('ipFile', './GeoLite2-City.mmdb')
}

const log = (...args) => console.log(...[moment().format(conf.get('web').dateFormat), ...args])

const loadIPdatabase = () => {
  const ipFile = conf.get('ipFile')
  const loadFile = res => maxmind.open(ipFile)
    .then(lookup => res(ip => (ip ? lookup.get(ip) : false)))
    .catch(err => log(err))
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
