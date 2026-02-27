const db = require('../models')
const logger = require('../utils/logger')

const { Order, OrderItem, Commission, Withdrawal, Leader, Product } = db

/**
 * 清理演示数据
 */
const cleanDemoData = async () => {
  try {
    logger.info('🧹 开始清理演示数据...')
    
    // 1. 删除订单相关数据
    logger.info('📝 删除订单数据...')
    await OrderItem.destroy({ where: {} })
    await Commission.destroy({ where: {} })
    await Order.destroy({ where: {} })
    logger.info('✅ 订单数据已清理')
    
    // 2. 删除提现申请
    logger.info('📝 删除提现申请...')
    await Withdrawal.destroy({ where: {} })
    logger.info('✅ 提现申请已清理')
    
    // 3. 重置团长统计数据
    logger.info('📝 重置团长统计数据...')
    await Leader.update({
      balance: 0,
      totalOrders: 0,
      totalAmount: 0,
      totalCommission: 0
    }, { where: {} })
    logger.info('✅ 团长统计数据已重置')
    
    // 4. 重置商品销量
    logger.info('📝 重置商品销量...')
    await Product.update({ sales: 0 }, { where: {} })
    logger.info('✅ 商品销量已重置')
    
    logger.info('\n' + '='.repeat(60))
    logger.info('🎉 演示数据清理完成！')
    logger.info('='.repeat(60))
    logger.info('\n💡 提示：')
    logger.info('   - 用户账号保留（admin, leader）')
    logger.info('   - 商品数据保留')
    logger.info('   - 社区数据保留')
    logger.info('   - 订单、佣金、提现数据已清空')
    logger.info('   - 团长统计数据已重置')
    logger.info('\n   如需重新生成演示数据，请运行: pnpm run demo')
    logger.info('='.repeat(60))
    
    process.exit(0)
  } catch (err) {
    logger.error('❌ 清理演示数据失败:', err)
    process.exit(1)
  }
}

// 执行清理
cleanDemoData()
