const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Leader = sequelize.define('Leader', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      field: 'user_id',
      comment: '关联用户ID'
    },
    communityId: {
      type: DataTypes.INTEGER,
      field: 'community_id',
      comment: '关联社区ID'
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '团长姓名'
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: '联系电话'
    },
    commissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 12.00,
      field: 'commission_rate',
      comment: '佣金比例(%)(已废弃,改用等级加成)'
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '团长等级(1-5星)'
    },
    bonusRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'bonus_rate',
      comment: '等级加成比例(%)'
    },
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'total_orders',
      comment: '累计订单数'
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_amount',
      comment: '累计订单金额'
    },
    totalCommission: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'total_commission',
      comment: '累计佣金'
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: '账户余额'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态 1正常 0禁用'
    }
  }, {
    tableName: 'leaders',
    timestamps: true,
    underscored: true
  })
  
  return Leader
}
