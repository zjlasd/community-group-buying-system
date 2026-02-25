const express = require('express')
const router = express.Router()
const orderController = require('../controllers/orderController')
const { auth } = require('../middleware/auth')

// 所有订单接口都需要登录
router.use(auth)

/**
 * 订单管理路由
 */

// 获取订单列表(分页 + 搜索 + 筛选)
// GET /api/orders?page=1&pageSize=10&keyword=&status=&leaderId=&startDate=&endDate=
router.get('/', orderController.getOrders)

// 获取订单统计数据
// GET /api/orders/stats?startDate=&endDate=&leaderId=
router.get('/stats', orderController.getOrderStats)

// 生成配送清单
// GET /api/orders/delivery-list?deliveryDate=2024-01-01&groupBy=leader
router.get('/delivery-list', orderController.generateDeliveryList)

// 获取订单详情
// GET /api/orders/:id
router.get('/:id', orderController.getOrderById)

// 更新订单状态
// PATCH /api/orders/:id/status { "status": "confirmed" }
router.patch('/:id/status', orderController.updateOrderStatus)

// 批量删除订单(仅管理员)
// POST /api/orders/batch/delete { "ids": [1, 2, 3] }
router.post('/batch/delete', orderController.batchDeleteOrders)

module.exports = router
