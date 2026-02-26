const { Product } = require('../models')
const { success, error } = require('../utils/response')
const logger = require('../utils/logger')
const { Op } = require('sequelize')

// 商品列表（分页、搜索、筛选）
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      keyword = '',
      category = '',
      status = '',
      orderBy = 'created_at',
      sortDirection = 'DESC'
    } = req.query

    // 白名单验证排序字段
    const allowedOrderFields = ['id', 'name', 'price', 'stock', 'sales', 'created_at']
    const allowedSortDirections = ['ASC', 'DESC']

    if (!allowedOrderFields.includes(orderBy)) {
      return res.status(400).json(error('无效的排序字段', 400))
    }

    if (!allowedSortDirections.includes(sortDirection.toUpperCase())) {
      return res.status(400).json(error('无效的排序方向', 400))
    }

    // 构建查询条件
    const where = {}

    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { description: { [Op.like]: `%${keyword}%` } }
      ]
    }

    if (category) {
      where.category = category
    }

    if (status !== '') {
      where.status = parseInt(status)
    }

    // 查询数据
    const offset = (page - 1) * pageSize
    const limit = parseInt(pageSize)

    const { count, rows } = await Product.findAndCountAll({
      where,
      order: [[orderBy, sortDirection.toUpperCase()]],
      offset,
      limit
    })

    res.json(success({
      list: rows,
      total: count,
      page: parseInt(page),
      pageSize: limit
    }, '查询成功'))
  } catch (err) {
    logger.error('查询商品列表失败:', err)
    next(err)
  }
}

// 商品详情
exports.getProduct = async (req, res, next) => {
  try {
    const { id } = req.params

    const product = await Product.findByPk(id)

    if (!product) {
      return res.status(404).json(error('商品不存在', 404))
    }

    res.json(success(product, '查询成功'))
  } catch (err) {
    logger.error('查询商品详情失败:', err)
    next(err)
  }
}

// 创建商品
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      price,
      commission_rate,
      stock,
      image_url,
      description
    } = req.body

    // 参数验证
    if (!name || !price) {
      return res.status(400).json(error('商品名称和价格不能为空', 400))
    }

    if (price <= 0) {
      return res.status(400).json(error('商品价格必须大于0', 400))
    }

    // 创建商品
    const product = await Product.create({
      name,
      category,
      price,
      commission_rate: commission_rate || 12.00,
      stock: stock || 0,
      image_url,
      description,
      status: 1
    })

    logger.info(`创建商品成功: ${product.name} (ID: ${product.id})`)
    res.status(201).json(success(product, '创建成功'))
  } catch (err) {
    logger.error('创建商品失败:', err)
    next(err)
  }
}

// 更新商品
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params
    const {
      name,
      category,
      price,
      commission_rate,
      stock,
      image_url,
      description
    } = req.body

    const product = await Product.findByPk(id)

    if (!product) {
      return res.status(404).json(error('商品不存在', 404))
    }

    // 参数验证
    if (price !== undefined && price <= 0) {
      return res.status(400).json(error('商品价格必须大于0', 400))
    }

    // 更新商品
    await product.update({
      name: name || product.name,
      category: category !== undefined ? category : product.category,
      price: price !== undefined ? price : product.price,
      commission_rate: commission_rate !== undefined ? commission_rate : product.commission_rate,
      stock: stock !== undefined ? stock : product.stock,
      image_url: image_url !== undefined ? image_url : product.image_url,
      description: description !== undefined ? description : product.description
    })

    logger.info(`更新商品成功: ${product.name} (ID: ${product.id})`)
    res.json(success(product, '更新成功'))
  } catch (err) {
    logger.error('更新商品失败:', err)
    next(err)
  }
}

// 删除商品
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params

    const product = await Product.findByPk(id)

    if (!product) {
      return res.status(404).json(error('商品不存在', 404))
    }

    await product.destroy()

    logger.info(`删除商品成功: ${product.name} (ID: ${product.id})`)
    res.json(success(null, '删除成功'))
  } catch (err) {
    logger.error('删除商品失败:', err)
    next(err)
  }
}

// 更新商品状态（上下架）
exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (status === undefined || ![0, 1].includes(parseInt(status))) {
      return res.status(400).json(error('状态值无效', 400))
    }

    const product = await Product.findByPk(id)

    if (!product) {
      return res.status(404).json(error('商品不存在', 404))
    }

    await product.update({ status: parseInt(status) })

    const statusText = status === 1 ? '上架' : '下架'
    logger.info(`商品${statusText}成功: ${product.name} (ID: ${product.id})`)
    res.json(success(product, `${statusText}成功`))
  } catch (err) {
    logger.error('更新商品状态失败:', err)
    next(err)
  }
}

// 批量删除商品
exports.batchDelete = async (req, res, next) => {
  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json(error('请选择要删除的商品', 400))
    }

    const count = await Product.destroy({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    })

    logger.info(`批量删除商品成功: 删除了 ${count} 个商品`)
    res.json(success({ count }, `成功删除 ${count} 个商品`))
  } catch (err) {
    logger.error('批量删除商品失败:', err)
    next(err)
  }
}

// 获取商品分类列表
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Product.findAll({
      attributes: ['category'],
      where: {
        category: {
          [Op.ne]: null
        }
      },
      group: ['category']
    })

    const categoryList = categories.map(item => item.category).filter(Boolean)

    res.json(success(categoryList, '查询成功'))
  } catch (err) {
    logger.error('查询商品分类失败:', err)
    next(err)
  }
}

// 获取商品销售统计
exports.getProductSales = async (req, res, next) => {
  try {
    const { id } = req.params
    const { limit = 30 } = req.query

    const { OrderItem, Order } = require('../models')

    // 查询商品是否存在
    const product = await Product.findByPk(id)
    if (!product) {
      return res.status(404).json(error('商品不存在', 404))
    }

    // 按天统计销售数据（最近N天）
    const salesData = await OrderItem.findAll({
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('Order.created_at')), 'date'],
        [require('sequelize').fn('SUM', require('sequelize').col('OrderItem.quantity')), 'quantity'],
        [require('sequelize').fn('SUM', require('sequelize').col('OrderItem.subtotal')), 'amount']
      ],
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: {
          status: {
            [Op.in]: ['confirmed', 'delivering', 'pickup', 'completed']
          }
        }
      }],
      where: {
        productId: id
      },
      group: [require('sequelize').fn('DATE', require('sequelize').col('Order.created_at'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('Order.created_at')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    })

    // 计算佣金
    const salesWithCommission = salesData.map(item => ({
      date: item.date,
      quantity: parseInt(item.quantity) || 0,
      amount: parseFloat(item.amount) || 0,
      commission: (parseFloat(item.amount) * parseFloat(product.commission_rate) / 100).toFixed(2)
    }))

    // 累计统计
    const totalStats = {
      totalQuantity: product.sales || 0,
      totalAmount: (parseFloat(product.price) * (product.sales || 0)).toFixed(2),
      totalCommission: (parseFloat(product.price) * (product.sales || 0) * parseFloat(product.commission_rate) / 100).toFixed(2)
    }

    res.json(success({
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        commission_rate: product.commission_rate,
        stock: product.stock,
        sales: product.sales
      },
      totalStats,
      recentSales: salesWithCommission
    }, '查询成功'))
  } catch (err) {
    logger.error('查询商品销售统计失败:', err)
    next(err)
  }
}
