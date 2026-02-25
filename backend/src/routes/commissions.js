const express = require('express')
const router = express.Router()
const commissionController = require('../controllers/commissionController')
const { authenticateToken, authorizeRole } = require('../middleware/auth')

// 所有路由都需要登录认证
router.use(authenticateToken)

/**
 * 佣金管理路由
 */

// 获取佣金记录列表（团长可查看自己的，管理员可查看全部）
router.get('/', commissionController.getCommissions)

// 获取佣金统计数据
router.get('/stats', commissionController.getCommissionStats)

// 获取佣金详情
router.get('/:id', commissionController.getCommissionById)

// 创建佣金调整记录（仅管理员）
router.post('/adjustment', authorizeRole(['admin']), commissionController.createAdjustment)

// 批量结算佣金（仅管理员）
router.post('/batch/settle', authorizeRole(['admin']), commissionController.batchSettle)

module.exports = router
