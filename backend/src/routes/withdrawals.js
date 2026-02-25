const express = require('express')
const router = express.Router()
const withdrawalController = require('../controllers/withdrawalController')
const { authenticateToken, authorizeRole } = require('../middleware/auth')

// 所有路由都需要登录认证
router.use(authenticateToken)

/**
 * 提现管理路由
 */

// 获取提现申请列表（团长可查看自己的，管理员可查看全部）
router.get('/', withdrawalController.getWithdrawals)

// 获取提现统计数据
router.get('/stats', withdrawalController.getWithdrawalStats)

// 获取提现详情
router.get('/:id', withdrawalController.getWithdrawalById)

// 创建提现申请（团长）
router.post('/', withdrawalController.createWithdrawal)

// 审核提现申请（管理员）
router.post('/:id/review', authorizeRole(['admin']), withdrawalController.reviewWithdrawal)

// 取消提现申请（团长）
router.post('/:id/cancel', withdrawalController.cancelWithdrawal)

module.exports = router
