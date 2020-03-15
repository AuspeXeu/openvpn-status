const moment = require('moment')
const fs = require('fs')
const maxmind = require('maxmind')
const conf = require('nconf')
const path = require('path')

conf.file({file: path.resolve(__dirname, './cfg.json')})
conf.defaults({
  port: process.env.STATUS_PORT || 3013,
  bind: process.env.STATUS_BIND || '127.0.0.1',
  servers: [],
  username: process.env.STATUS_USERNAME || 'admin',
  password: process.env.STATUS_PASSWORD || 'admin',
  web: {
    dateFormat: process.env.STATUS_WEB_FORMAT || 'HH:mm:ss - DD.MM.YY'
  }
})

const servers = fs.readdirSync(path.resolve(__dirname, './servers'))
  .filter((fname) => fname.endsWith('.json'))
  .map((fname) => JSON.parse(fs.readFileSync(path.resolve(__dirname, `./servers/${fname}`), 'utf8')))
conf.set('servers', [...conf.get('servers'), ...servers])

const log = (...args) => console.log(...[moment().format(conf.get('web').dateFormat), ...args])

const loadIPdatabase = () => {
  return new Promise((resolve, reject) => {
    maxmind.open(path.resolve(__dirname, 'GeoLite2-City.mmdb'))
      .then((lookup) => resolve(ip => (ip ? lookup.get(ip) : false)))
      .catch((err) => {reject();log(err)})
  })
}

module.exports = {log, loadIPdatabase, conf}
