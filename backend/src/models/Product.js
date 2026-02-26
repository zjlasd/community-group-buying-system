const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '商品名称'
    },
    category: {
      type: DataTypes.STRING(50),
      comment: '商品分类'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '销售价格'
    },
    commissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 12.00,
      field: 'commission_rate',
      comment: '佣金比例(%)(已废弃,改用commissionAmount)'
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: 'commission_amount',
      comment: '商品基础佣金(固定金额)'
    },
    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '库存数量'
    },
    sales: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '累计销量'
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      field: 'image_url',
      comment: '商品图片'
    },
    description: {
      type: DataTypes.TEXT,
      comment: '商品描述'
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: '状态 1上架 0下架'
    }
  }, {
    tableName: 'products',
    timestamps: true,
    underscored: true
  })
  
  return Product
}
