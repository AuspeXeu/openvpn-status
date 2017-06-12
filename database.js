const Sequelize = require('sequelize')

const init = () => {
  return new Promise ((resolve) => {
    const sequelize = new Sequelize('status', 'server', '!$%openvpn1', {
      dialect: 'sqlite',
      storage: './data.sqlite',
      logging: false,
      pool: {max: 5, min: 0, idle: 10000}
    })

    const Log = sequelize.define('Log', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      timestamp : {type: Sequelize.INTEGER},
      server    : {type: Sequelize.INTEGER},
      node      : {type: Sequelize.STRING},
      event     : {type: Sequelize.STRING}
    },{
      freezeTableName: true,
      paranoid: true,
      tableName: 'Log'
    })

    module.exports.Log = Log
    module.exports.state = () => sequelize.query('select p1.* from log as p1 inner join (select max(timestamp) as timestamp, node from log group by node) as p2 on p1.node = p2.node and p1.timestamp = p2.timestamp where p1.event = \'connect\'', {model:Log})

    Log.sync().then(resolve)
  })
}

module.exports = {
  init: init
}
