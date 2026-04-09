/**
 * AI 智能助手路由
 */
const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const aiController = require('../controllers/aiController')

// AI 对话接口（需要登录）
router.post('/chat', authenticateToken, aiController.chat)

// 获取 AI 服务状态（健康检查，无需登录）
router.get('/status', aiController.getStatus)

module.exports = router
