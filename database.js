const Sequelize = require('sequelize')

const sequelize = new Sequelize('status', 'server', '!$%openvpn1', {
  dialect: 'sqlite',
  storage: './data.sqlite',
  logging: false,
  pool: {max: 5, min: 0, idle: 10000},
  operatorsAliases: false
})

const Log = sequelize.define('Log', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timestamp : {type: Sequelize.INTEGER},
  server    : {type: Sequelize.INTEGER},
  pub       : {type: Sequelize.STRING},
  vpn       : {type: Sequelize.STRING},
  node      : {type: Sequelize.STRING},
  event     : {type: Sequelize.STRING}
},{
  freezeTableName: true,
  timestamps: false,
  tableName: 'Log'
})

module.exports = {
  init: () => Log.sync(),
  Log: Log,
  op: Sequelize.Op
}
