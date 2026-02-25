const express = require('express')
const router = express.Router()
const customerController = require('../controllers/customerController')
const { authenticateToken, authorizeRole } = require('../middleware/auth')

// 所有路由都需要登录认证（仅团长）
router.use(authenticateToken)
router.use(authorizeRole(['leader']))

/**
 * 客户管理路由（团长端）
 */

// 获取客户列表
router.get('/', customerController.getCustomers)

// 获取客户详情
router.get('/:phone', customerController.getCustomerDetail)

module.exports = router
