const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Withdrawal = sequelize.define('Withdrawal', {
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
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '提现金额'
    },
    accountName: {
      type: DataTypes.STRING(50),
      field: 'account_name',
      comment: '账户名'
    },
    accountNumber: {
      type: DataTypes.STRING(100),
      field: 'account_number',
      comment: '账号'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      comment: '状态: pending待审核, approved已通过, rejected已拒绝'
    },
    rejectReason: {
      type: DataTypes.STRING(200),
      field: 'reject_reason',
      comment: '拒绝原因'
    },
    reviewedAt: {
      type: DataTypes.DATE,
      field: 'reviewed_at',
      comment: '审核时间'
    }
  }, {
    tableName: 'withdrawals',
    timestamps: true,
    underscored: true,
    updatedAt: false
  })
  
  return Withdrawal
}
