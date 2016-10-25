const express = require('express')
const app = express()
const conf = require('nconf')
const _ = require('lodash')
const process = require('child_process')
const moment = require('moment')
const morgan = require('morgan')
const ejs = require('ejs')

conf.file({ file: 'config.json' })

app.set('views', __dirname + '/views')
app.set('view engine', 'ejs')
app.use(morgan('dev'))
app.use('/assets', express.static(__dirname + '/assets'))

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
    res.send(JSON.stringify(obj))
  })
  terminal.stdin.write('awk \'/OpenVPN/,/END/\' ' + conf.get('logFile'))
  terminal.stdin.end()
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
    res.send(JSON.stringify(entries))
  })
  terminal.stdin.write('awk \'/Ref/,/GLOBAL/\' ' + conf.get('logFile'))
  terminal.stdin.end()
})

app.listen(conf.get('port'))
