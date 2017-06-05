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

    Log.sync().then(resolve)
  })
}

module.exports = {
  init: init
}
