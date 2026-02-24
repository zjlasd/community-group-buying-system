const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '用户名'
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '密码(bcrypt加密)'
    },
    role: {
      type: DataTypes.ENUM('admin', 'leader'),
      defaultValue: 'leader',
      comment: '角色'
    },
    realName: {
      type: DataTypes.STRING(50),
      field: 'real_name',
      comment: '真实姓名'
    },
    phone: {
      type: DataTypes.STRING(20),
      comment: '手机号'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true
  })
  
  return User
}
