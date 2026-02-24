const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Commission = sequelize.define('Commission', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    leaderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'leader_id',
      comment: '团长ID'
    },
    orderId: {
      type: DataTypes.INTEGER,
      field: 'order_id',
      comment: '关联订单ID'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '佣金金额'
    },
    type: {
      type: DataTypes.ENUM('order', 'adjustment'),
      defaultValue: 'order',
      comment: '类型: order订单佣金, adjustment调整'
    },
    status: {
      type: DataTypes.ENUM('pending', 'settled'),
      defaultValue: 'pending',
      comment: '状态: pending待结算, settled已结算'
    },
    remark: {
      type: DataTypes.STRING(200),
      comment: '备注'
    }
  }, {
    tableName: 'commissions',
    timestamps: true,
    underscored: true,
    updatedAt: false
  })
  
  return Commission
}
