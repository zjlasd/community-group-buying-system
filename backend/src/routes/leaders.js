const express = require('express')
const router = express.Router()
const leaderController = require('../controllers/leaderController')
const { authenticateToken, authorizeRole } = require('../middleware/auth')

// 所有路由都需要登录认证
router.use(authenticateToken)

/**
 * 团长管理路由
 */

// 获取团长列表(管理员权限)
router.get('/', authorizeRole(['admin']), leaderController.getLeaders)

// 获取团长详情
router.get('/:id', leaderController.getLeaderById)

// 获取团长统计信息
router.get('/:id/stats', leaderController.getLeaderStats)

// 获取团长业绩排行榜(管理员权限)
router.get('/ranking/list', authorizeRole(['admin']), leaderController.getLeaderRanking)

// 创建团长(管理员权限)
router.post('/', authorizeRole(['admin']), leaderController.createLeader)

// 更新团长信息(管理员权限)
router.put('/:id', authorizeRole(['admin']), leaderController.updateLeader)

// 删除团长(管理员权限)
router.delete('/:id', authorizeRole(['admin']), leaderController.deleteLeader)

module.exports = router
