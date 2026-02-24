const { Sequelize } = require('sequelize')
const dbConfig = require('../config/database')

const env = process.env.NODE_ENV || 'development'
const config = dbConfig[env]

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
)

// 导入模型
const User = require('./User')(sequelize)
const Community = require('./Community')(sequelize)
const Leader = require('./Leader')(sequelize)
const Product = require('./Product')(sequelize)
const Order = require('./Order')(sequelize)
const OrderItem = require('./OrderItem')(sequelize)
const Commission = require('./Commission')(sequelize)
const Withdrawal = require('./Withdrawal')(sequelize)

// 定义关联关系

// User 与 Leader 一对一
User.hasOne(Leader, { foreignKey: 'userId', as: 'leaderInfo' })
Leader.belongsTo(User, { foreignKey: 'userId', as: 'user' })

// Community 与 Leader 一对多
Community.hasMany(Leader, { foreignKey: 'communityId', as: 'leaders' })
Leader.belongsTo(Community, { foreignKey: 'communityId', as: 'community' })

// Leader 与 Order 一对多
Leader.hasMany(Order, { foreignKey: 'leaderId', as: 'orders' })
Order.belongsTo(Leader, { foreignKey: 'leaderId', as: 'leader' })

// Community 与 Order 一对多
Community.hasMany(Order, { foreignKey: 'communityId', as: 'orders' })
Order.belongsTo(Community, { foreignKey: 'communityId', as: 'community' })

// Order 与 OrderItem 一对多
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' })
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })

// Product 与 OrderItem 一对多
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' })
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' })

// Leader 与 Commission 一对多
Leader.hasMany(Commission, { foreignKey: 'leaderId', as: 'commissions' })
Commission.belongsTo(Leader, { foreignKey: 'leaderId', as: 'leader' })

// Order 与 Commission 一对一
Order.hasOne(Commission, { foreignKey: 'orderId', as: 'commission' })
Commission.belongsTo(Order, { foreignKey: 'orderId', as: 'order' })

// Leader 与 Withdrawal 一对多
Leader.hasMany(Withdrawal, { foreignKey: 'leaderId', as: 'withdrawals' })
Withdrawal.belongsTo(Leader, { foreignKey: 'leaderId', as: 'leader' })

// 导出模型
const db = {
  sequelize,
  Sequelize,
  User,
  Community,
  Leader,
  Product,
  Order,
  OrderItem,
  Commission,
  Withdrawal
}

module.exports = db
