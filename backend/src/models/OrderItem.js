const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'order_id',
      comment: '订单ID'
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      comment: '商品ID'
    },
    productName: {
      type: DataTypes.STRING(100),
      field: 'product_name',
      comment: '商品名称快照'
    },
    productPrice: {
      type: DataTypes.DECIMAL(10, 2),
      field: 'product_price',
      comment: '商品价格快照'
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '购买数量'
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      comment: '小计金额'
    }
  }, {
    tableName: 'order_items',
    timestamps: false
  })
  
  return OrderItem
}
