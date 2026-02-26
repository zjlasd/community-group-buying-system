const express = require('express')
const router = express.Router()
const productController = require('../controllers/productController')
const { auth } = require('../middleware/auth')
const { checkRole } = require('../middleware/roleCheck')

// 所有路由都需要登录
router.use(auth)

// 获取商品分类列表（所有角色）- 必须放在 /:id 之前
router.get('/meta/categories', productController.getCategories)

// 获取商品列表（所有角色）
router.get('/', productController.getProducts)

// 获取商品销售统计（所有角色）- 必须放在 /:id 之前
router.get('/:id/sales', productController.getProductSales)

// 获取商品详情（所有角色）
router.get('/:id', productController.getProduct)

// 以下路由仅管理员可访问
router.post('/', checkRole(['admin']), productController.createProduct)
router.put('/:id', checkRole(['admin']), productController.updateProduct)
router.delete('/:id', checkRole(['admin']), productController.deleteProduct)
router.patch('/:id/status', checkRole(['admin']), productController.updateStatus)
router.post('/batch/delete', checkRole(['admin']), productController.batchDelete)

module.exports = router
