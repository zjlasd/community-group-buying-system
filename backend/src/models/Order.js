const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'order_no',
      comment: '订单号'
    },
    leaderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'leader_id',
      comment: '团长ID'
    },
    communityId: {
      type: DataTypes.INTEGER,
      field: 'community_id',
      comment: '社区ID'
    },
    customerName: {
      type: DataTypes.STRING(50),
      field: 'customer_name',
      comment: '消费者姓名'
    },
    customerPhone: {
      type: DataTypes.STRING(20),
      field: 'customer_phone',
      comment: '消费者手机'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'total_amount',
      comment: '订单总金额'
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'commission_amount',
      comment: '佣金金额'
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'delivering', 'pickup', 'completed', 'cancelled'),
      defaultValue: 'pending',
      comment: '订单状态'
    },
    confirmedAt: {
      type: DataTypes.DATE,
      field: 'confirmed_at',
      comment: '确认时间'
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at',
      comment: '完成时间'
    }
  }, {
    tableName: 'orders',
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [
      { fields: ['leader_id'] },
      { fields: ['status'] },
      { fields: ['created_at'] }
    ]
  })
  
  return Order
}
