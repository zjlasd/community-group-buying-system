const express = require('express')
const cors = require('cors')
const appConfig = require('./config/app')
const logger = require('./utils/logger')
const errorHandler = require('./middleware/errorHandler')
const db = require('./models')

// 创建 Express 应用
const app = express()

// 中间件
app.use(cors({
  origin: appConfig.corsOrigin,
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API 路由
app.use('/api/auth', require('./routes/auth'))
// TODO: 添加其他路由
// app.use('/api/users', require('./routes/users'))
// app.use('/api/leaders', require('./routes/leaders'))
// app.use('/api/products', require('./routes/products'))
// app.use('/api/orders', require('./routes/orders'))
// app.use('/api/commissions', require('./routes/commissions'))
// app.use('/api/withdrawals', require('./routes/withdrawals'))

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null
  })
})

// 全局错误处理
app.use(errorHandler)

// 数据库连接和启动服务器
const startServer = async () => {
  try {
    // 测试数据库连接
    await db.sequelize.authenticate()
    logger.info('数据库连接成功')
    
    // 同步数据库模型（开发环境）
    if (appConfig.env === 'development') {
      // alter: true 会尝试修改表结构以匹配模型
      // force: true 会删除并重建所有表（慎用！）
      await db.sequelize.sync({ alter: true })
      logger.info('数据库模型同步成功')
    }
    
    // 启动服务器
    app.listen(appConfig.port, () => {
      logger.info(`服务器运行在 http://localhost:${appConfig.port}`)
      logger.info(`环境: ${appConfig.env}`)
    })
  } catch (err) {
    logger.error('启动失败:', err)
    process.exit(1)
  }
}

// 启动
startServer()

module.exports = app
