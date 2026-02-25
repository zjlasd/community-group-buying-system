const express = require('express')
const router = express.Router()
const dashboardController = require('../controllers/dashboardController')
const { authenticateToken, authorizeRole } = require('../middleware/auth')

// 所有路由都需要登录认证
router.use(authenticateToken)

/**
 * 数据看板路由
 */

// 获取管理员看板数据
router.get('/admin', authorizeRole(['admin']), dashboardController.getAdminDashboard)

// 获取团长看板数据
router.get('/leader', authorizeRole(['leader']), dashboardController.getLeaderDashboard)

module.exports = router
