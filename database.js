const Sequelize = require('sequelize')

const sequelize = new Sequelize('status', 'server', '!$%openvpn1', {
  dialect: 'sqlite',
  storage: './data.sqlite',
  logging: false,
  pool: {max: 5, min: 0, idle: 10000}
})

const mkId = () => ({
  type: Sequelize.INTEGER,
  primaryKey: true,
  autoIncrement: true
})

const Log = sequelize.define('Log', {
  id: mkId(),
  timestamp: {type: Sequelize.INTEGER},
  server: {type: Sequelize.INTEGER},
  pub: {type: Sequelize.STRING},
  vpn: {type: Sequelize.STRING},
  node: {type: Sequelize.STRING},
  event: {type: Sequelize.STRING}
}, {
  freezeTableName: true,
  timestamps: false,
  tableName: 'Log'
})

const Client = sequelize.define('Clent', {
  id: mkId(),
  server: {type: Sequelize.INTEGER},
  name: {type: Sequelize.STRING},
  sent: {type: Sequelize.INTEGER, defaultValue: 0},
  received: {type: Sequelize.INTEGER, defaultValue: 0}
})

module.exports = {
  init: () => Promise.all([Log.sync(), Client.sync()]),
  Log,
  Client,
  op: Sequelize.Op
}
