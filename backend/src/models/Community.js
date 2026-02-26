const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const Community = sequelize.define('Community', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '社区名称'
    },
    address: {
      type: DataTypes.STRING(200),
      comment: '社区地址'
    },
    district: {
      type: DataTypes.STRING(50),
      comment: '所属区域'
    }
  }, {
    tableName: 'communities',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',  // 映射到数据库的 created_at 字段
    updatedAt: false
  })
  
  return Community
}
