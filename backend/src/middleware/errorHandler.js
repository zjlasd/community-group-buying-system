const logger = require('../utils/logger')

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  // 记录错误日志
  logger.error(`${req.method} ${req.path} - ${err.message}`, {
    error: err.stack,
    body: req.body,
    params: req.params,
    query: req.query
  })
  
  // Sequelize 验证错误
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      code: 400,
      message: '数据验证失败',
      data: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    })
  }
  
  // Sequelize 唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({
      code: 400,
      message: '数据已存在',
      data: err.errors.map(e => ({
        field: e.path,
        message: e.message
      }))
    })
  }
  
  // Sequelize 外键约束错误
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      code: 400,
      message: '关联数据不存在或无法删除'
    })
  }
  
  // 默认错误响应
  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
    data: null
  })
}

module.exports = errorHandler
