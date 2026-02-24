const db = require('../models')
const logger = require('../utils/logger')

/**
 * 初始化数据库
 */
const initDatabase = async () => {
  try {
    logger.info('开始初始化数据库...')
    
    // 测试连接
    await db.sequelize.authenticate()
    logger.info('数据库连接成功')
    
    // 同步所有模型（创建表）
    // force: true 会删除已存在的表并重建
    await db.sequelize.sync({ force: true })
    logger.info('数据库表创建成功')
    
    logger.info('数据库初始化完成！')
    logger.info('提示：运行 npm run seed 来填充测试数据')
    
    process.exit(0)
  } catch (err) {
    logger.error('数据库初始化失败:', err)
    process.exit(1)
  }
}

// 执行初始化
initDatabase()
