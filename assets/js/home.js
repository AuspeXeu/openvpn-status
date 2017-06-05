$(document).ready(function () {
  //Configure countdown interval
  var countdown_reset = 30

  var servers = {}
  var countdown = countdown_reset
  var intervalId = undefined
  var hasChanged = function (val, server) {
    if (!servers[server].nodes[val.vpn]) {
      servers[server].nodes[val.vpn] = val
      return true
    } else if (servers[server].nodes[val.vpn].timestamp !== val.timestamp) {
      servers[server].nodes[val.vpn] = val
      return true
    }
  }
  var socket = new WebSocket(window.location.origin.replace('http','ws') + '/wss/log')
  socket.onmessage = function (event) {
    var data = JSON.parse(event.data)
    data.timestamp = moment(data.timestamp).format('HH:mm')
    if (data.event === 'connect') {
      data.help = 'This node just established a connection to the server.'
      data.icon = 'fa-plug'
    } else if (data.event === 'disconnect') {
      data.help = 'This node just closed the connection to the server.'
      data.icon = 'fa-remove'
    }
    $('#log_' + data.server).prepend($.markup('log-entry', data))
  }
  var refreshData = function (server) {
    countdown = countdown_reset
    $('#txt_refresh').html('&nbsp;' + countdown)
    clearInterval(intervalId)
    $.get('/entries/' + server, function (response) {
      response = _.sortBy(response, function (itm) {
        return itm.pub
      })
      if (!servers[server])
        servers[server] = {nodes:[]}
      _.forIn(servers[server].nodes, function (val, key) {
        if (!_.findWhere(response, { vpn: key }))
          delete servers[server].nodes[key]
      })
      $('#nodes_' + server + ' > tr').remove()
      _.each(response, function (item) {
        item.timestamp = moment(item.timestamp * 1000).format('HH:mm - DD.MM.YYYY')
        item.changed = hasChanged(item, server) ? 'highlight' : ''
        $('#lbl_updated_' + server).text(moment().format('HH:mm - DD.MM.YYYY'))
        $('#nodes_' + server).append($.markup('status-entry', item))
          $.get('/geoip/' + item.pub)
            .done(function (data) {
              $('.flag_' + item.name).attr('src', '/assets/images/flags/' + data.country.iso_code + '.png')
              $('.flag_' + item.name).attr('title', data.country.names.en)
            })
      })
      enableAutoRefresh(server)
    })
  }
  var enableAutoRefresh = function (server) {
    intervalId = setInterval(function () {
      if (countdown === 0)
        refreshData(server)
      else {
        countdown--
        $('.txt_refresh').html('&nbsp;' + countdown)
      }
    }, 1000)
  }
  $.markup.load(function () {
    refreshData(0)
    $('.txt_refresh').html('&nbsp;' + countdown)
    $('.btn_refresh').on('click', function (ev) {
      var server = $(ev.target).closest('.tab-pane').data('server')
      refreshData(server)
    })
    $('.btn_clear').on('click', function (ev) {
      var server = $(ev.target).closest('.tab-pane').data('server')
      $('#log_' + server + ' > tr').remove()
    })
    $('.btn_refresh').hover(function () {
      $('.btn_refresh > i').addClass('fa-spin')
    }, function () {
      $('.btn_refresh > i').removeClass('fa-spin')
    })
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
      var target = $(e.target).attr("href")
      var server = parseInt(target.match(/[0-9]+/), 10)
      refreshData(server)
    })
  })
})
