const moment = require('moment')
const maxmind = require('maxmind')
const conf = require('nconf')
const path = require('path')

conf.file({file: path.join(__dirname, 'cfg.json')})
conf.defaults({
  port: process.env.STATUS_PORT || 3013,
  bind: process.env.STATUS_BIND || '127.0.0.1',
  servers: [{
    name: 'Server', host: '127.0.0.1', man_port: 7656
  }],
  username: process.env.STATUS_USERNAME || 'admin',
  password: process.env.STATUS_PASSWORD || 'admin',
  web: {
    dateFormat: process.env.STATUS_WEB_FORMAT || 'HH:mm:ss - DD.MM.YY'
  }
})

const log = (...args) => console.log(...[moment().format(conf.get('web').dateFormat), ...args])

const loadIPdatabase = () => {
  return new Promise((resolve, reject) => {
    maxmind.open(path.join(__dirname, 'GeoLite2-City.mmdb'))
      .then((lookup) => resolve(ip => (ip ? lookup.get(ip) : false)))
      .catch((err) => {reject();log(err)})
  })
}

module.exports = {log, loadIPdatabase, conf}
