const express = require('express')
const router = express.Router()
const communityController = require('../controllers/communityController')
const { authenticateToken, authorizeRole } = require('../middleware/auth')

// 所有路由都需要登录认证
router.use(authenticateToken)

/**
 * 社区管理路由
 */

// 获取区域列表（所有角色）- 必须放在 /:id 之前
router.get('/meta/districts', communityController.getDistricts)

// 获取区域统计（所有角色）
router.get('/areas', communityController.getCommunityAreas)

// 获取所有社区（不分页，用于下拉选择）
router.get('/all', communityController.getAllCommunities)

// 获取社区列表（所有角色）
router.get('/', communityController.getCommunities)

// 获取社区详情（所有角色）
router.get('/:id', communityController.getCommunityById)

// 获取社区下的团长列表（所有角色）
router.get('/:id/leaders', communityController.getCommunityLeaders)

// 创建社区（管理员）
router.post('/', authorizeRole(['admin']), communityController.createCommunity)

// 更新社区信息（管理员）
router.put('/:id', authorizeRole(['admin']), communityController.updateCommunity)

// 删除社区（管理员）
router.delete('/:id', authorizeRole(['admin']), communityController.deleteCommunity)

module.exports = router
