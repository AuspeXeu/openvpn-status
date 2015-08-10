var express = require('express')
var app = express()
var nconf = require('nconf')
var _ = require('lodash')
var process = require('child_process')
var moment = require('moment')
var morgan = require('morgan')
var ejs = require('ejs')

nconf.file({ file: 'config.json' })

app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(morgan('dev'))
app.use('/assets', express.static(__dirname + '/assets'))

app.get('/', function (req, res) {
  res.render('home')
})

app.get('/entries', function (req, res) {
  var terminal = process.spawn('bash')
  terminal.stdout.on('data', function (data) {
    data = data.toString()
    var ary = data.split('\n')
    ary.shift()
    ary.pop()
    ary.pop()
    var entries = []
    _.each(ary, function (entry) {
      var split = entry.split(',')
      var itm = {
        vpn: split[0],
        name: split[1],
        timestamp: moment(new Date(split[3])).unix()
      }
      entries.push(itm)
    })
    res.send(JSON.stringify(entries))
  })
  terminal.stdin.write('awk \'/Ref/,/GLOBAL/\' /etc/openvpn/openvpn-status.log')
  terminal.stdin.end()
})

app.listen(nconf.get('port'))
