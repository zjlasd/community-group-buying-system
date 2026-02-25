const db = require('../models')
const { Op } = require('sequelize')
const logger = require('../utils/logger')

/**
 * 订单管理控制器
 */
class OrderController {
  /**
   * 获取订单列表(分页 + 搜索 + 筛选)
   */
  async getOrders(req, res) {
    try {
      const {
        page = 1,
        pageSize = 10,
        keyword = '',
        status = '',
        leaderId = '',
        startDate = '',
        endDate = ''
      } = req.query

      const offset = (page - 1) * pageSize
      const limit = parseInt(pageSize)

      // 构建查询条件
      const where = {}

      // 关键词搜索(订单号/客户姓名/手机号)
      if (keyword) {
        where[Op.or] = [
          { orderNo: { [Op.like]: `%${keyword}%` } },
          { customerName: { [Op.like]: `%${keyword}%` } },
          { customerPhone: { [Op.like]: `%${keyword}%` } }
        ]
      }

      // 订单状态筛选
      if (status) {
        where.status = status
      }

      // 团长筛选
      if (leaderId) {
        where.leaderId = parseInt(leaderId)
      }

      // 日期范围筛选
      if (startDate && endDate) {
        where.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
        }
      }

      // 权限控制: 团长只能看自己的订单
      if (req.user.role === 'leader') {
        // 通过userId查询团长信息
        logger.info(`团长查询订单 - userId: ${req.user.userId}`)
        const leader = await db.Leader.findOne({
          where: { userId: req.user.userId }
        })
        
        logger.info(`查询到的团长信息: ${JSON.stringify(leader)}`)
        
        if (!leader) {
          return res.status(403).json({
            code: 403,
            message: '未找到团长信息'
          })
        }
        
        where.leaderId = leader.id
      }

      // 查询订单列表(关联团长和社区信息)
      logger.info(`开始查询订单列表，where条件: ${JSON.stringify(where)}`)
      
      const { count, rows } = await db.Order.findAndCountAll({
        where,
        offset,
        limit,
        order: [['created_at', 'DESC']],
        distinct: true,
        include: [
          {
            model: db.Leader,
            as: 'leader',
            attributes: ['id', 'name', 'phone', 'commissionRate'],
            required: false
          },
          {
            model: db.Community,
            as: 'community',
            attributes: ['id', 'name', 'address'],
            required: false
          }
        ]
      })
      
      logger.info(`查询到${rows.length}条订单`)
      
      // 转换为普通JSON对象
      const plainRows = rows.map(row => row.get({ plain: true }))
      logger.info(`第一订单数据: ${JSON.stringify(plainRows[0], null, 2)}`)

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          list: plainRows,
          total: count,
          page: parseInt(page),
          pageSize: limit
        }
      })
    } catch (err) {
      logger.error('获取订单列表失败:', err)
      logger.error('错误名称:', err.name)
      logger.error('错误消息:', err.message)
      logger.error('错误堆栈:', err.stack)
      if (err.errors) {
        logger.error('验证错误:', JSON.stringify(err.errors, null, 2))
      }
      if (err.parent) {
        logger.error('数据库错误:', err.parent.message)
      }
      res.status(500).json({
        code: 500,
        message: '获取订单列表失败: ' + err.message,
        data: null
      })
    }
  }

  /**
   * 获取订单详情
   */
  async getOrderById(req, res) {
    try {
      const { id } = req.params

      const order = await db.Order.findByPk(id, {
        include: [
          {
            model: db.Leader,
            as: 'leader',
            attributes: ['id', 'name', 'phone', 'commissionRate']
          },
          {
            model: db.Community,
            as: 'community',
            attributes: ['id', 'name', 'address']
          },
          {
            model: db.OrderItem,
            as: 'items',
            include: [
              {
                model: db.Product,
                as: 'product',
                attributes: ['id', 'name', 'imageUrl', 'price']
              }
            ]
          }
        ]
      })

      if (!order) {
        return res.status(404).json({
          code: 404,
          message: '订单不存在',
          data: null
        })
      }

      // 权限控制: 团长只能看自己的订单
      if (req.user.role === 'leader' && order.leaderId !== req.user.leaderId) {
        return res.status(403).json({
          code: 403,
          message: '无权查看此订单',
          data: null
        })
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: order
      })
    } catch (err) {
      logger.error('获取订单详情失败:', err)
      res.status(500).json({
        code: 500,
        message: '获取订单详情失败',
        data: null
      })
    }
  }

  /**
   * 更新订单状态
   */
  async updateOrderStatus(req, res) {
    try {
      const { id } = req.params
      const { status } = req.body

      // 白名单验证
      const ALLOWED_STATUS = ['pending', 'confirmed', 'delivering', 'pickup', 'completed', 'cancelled']
      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({
          code: 400,
          message: '无效的订单状态',
          data: null
        })
      }

      const order = await db.Order.findByPk(id)
      if (!order) {
        return res.status(404).json({
          code: 404,
          message: '订单不存在',
          data: null
        })
      }

      // 权限控制: 团长只能操作自己的订单
      if (req.user.role === 'leader' && order.leaderId !== req.user.leaderId) {
        return res.status(403).json({
          code: 403,
          message: '无权操作此订单',
          data: null
        })
      }

      // 更新状态
      const updateData = { status }

      // 自动记录时间戳
      if (status === 'confirmed') {
        updateData.confirmedAt = new Date()
      } else if (status === 'completed') {
        updateData.completedAt = new Date()
        
        // 订单完成时自动结算佣金
        await this._settleCommission(order)
      }

      await order.update(updateData)

      res.json({
        code: 200,
        message: '状态更新成功',
        data: order
      })
    } catch (err) {
      logger.error('更新订单状态失败:', err)
      res.status(500).json({
        code: 500,
        message: '更新订单状态失败',
        data: null
      })
    }
  }

  /**
   * 生成配送清单(按社区/团长汇总)
   */
  async generateDeliveryList(req, res) {
    try {
      const { deliveryDate, groupBy = 'leader' } = req.query

      if (!deliveryDate) {
        return res.status(400).json({
          code: 400,
          message: '请指定配送日期',
          data: null
        })
      }

      // 白名单验证
      const ALLOWED_GROUP_BY = ['leader', 'community']
      if (!ALLOWED_GROUP_BY.includes(groupBy)) {
        return res.status(400).json({
          code: 400,
          message: '无效的汇总方式',
          data: null
        })
      }

      // 查询指定日期需要配送的订单
      const orders = await db.Order.findAll({
        where: {
          status: { [Op.in]: ['confirmed', 'delivering'] },
          created_at: {
            [Op.between]: [
              new Date(deliveryDate),
              new Date(deliveryDate + ' 23:59:59')
            ]
          }
        },
        include: [
          {
            model: db.Leader,
            as: 'leader',
            attributes: ['id', 'name', 'phone']
          },
          {
            model: db.Community,
            as: 'community',
            attributes: ['id', 'name', 'address']
          },
          {
            model: db.OrderItem,
            as: 'items',
            include: [
              {
                model: db.Product,
                as: 'product',
                attributes: ['id', 'name', 'unit']
              }
            ]
          }
        ]
      })

      // 按商品汇总数量
      const deliveryList = {}

      orders.forEach(order => {
        const groupKey = groupBy === 'leader' 
          ? `${order.leader.id}_${order.leader.name}`
          : `${order.community.id}_${order.community.name}`

        if (!deliveryList[groupKey]) {
          deliveryList[groupKey] = {
            groupBy,
            id: groupBy === 'leader' ? order.leader.id : order.community.id,
            name: groupBy === 'leader' ? order.leader.name : order.community.name,
            phone: groupBy === 'leader' ? order.leader.phone : '',
            address: groupBy === 'community' ? order.community.address : '',
            products: {},
            totalOrders: 0,
            totalAmount: 0
          }
        }

        // 汇总商品数量
        order.items.forEach(item => {
          const productKey = item.productId
          if (!deliveryList[groupKey].products[productKey]) {
            deliveryList[groupKey].products[productKey] = {
              productId: item.productId,
              productName: item.productName,
              unit: item.product.unit || '件',
              quantity: 0
            }
          }
          deliveryList[groupKey].products[productKey].quantity += item.quantity
        })

        deliveryList[groupKey].totalOrders += 1
        deliveryList[groupKey].totalAmount += parseFloat(order.totalAmount)
      })

      // 转换为数组格式
      const result = Object.values(deliveryList).map(group => ({
        ...group,
        products: Object.values(group.products)
      }))

      res.json({
        code: 200,
        message: '生成成功',
        data: {
          deliveryDate,
          groupBy,
          list: result,
          totalGroups: result.length,
          totalOrders: orders.length
        }
      })
    } catch (err) {
      logger.error('生成配送清单失败:', err)
      res.status(500).json({
        code: 500,
        message: '生成配送清单失败',
        data: null
      })
    }
  }

  /**
   * 获取订单统计数据
   */
  async getOrderStats(req, res) {
    try {
      const { startDate, endDate, leaderId } = req.query

      const where = {}

      // 日期范围
      if (startDate && endDate) {
        where.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate + ' 23:59:59')]
        }
      }

      // 团长筛选(权限控制)
      if (req.user.role === 'leader') {
        where.leaderId = req.user.leaderId
      } else if (leaderId) {
        where.leaderId = parseInt(leaderId)
      }

      // 统计各状态订单数量
      const statusStats = await db.Order.findAll({
        where,
        attributes: [
          'status',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
          [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount']
        ],
        group: ['status'],
        raw: true
      })

      // 统计总订单数和总金额
      const totalStats = await db.Order.findOne({
        where,
        attributes: [
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'totalOrders'],
          [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
          [db.sequelize.fn('SUM', db.sequelize.col('commission_amount')), 'totalCommission']
        ],
        raw: true
      })

      // 按日期统计订单趋势(最近7天)
      const trendStats = await db.Order.findAll({
        where,
        attributes: [
          [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
          [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount']
        ],
        group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
        order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'DESC']],
        limit: 7,
        raw: true
      })

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          statusStats,
          totalStats,
          trendStats: trendStats.reverse()
        }
      })
    } catch (err) {
      logger.error('获取订单统计失败:', err)
      res.status(500).json({
        code: 500,
        message: '获取订单统计失败',
        data: null
      })
    }
  }

  /**
   * 批量删除订单
   */
  async batchDeleteOrders(req, res) {
    try {
      const { ids } = req.body

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '请选择要删除的订单',
          data: null
        })
      }

      // 权限控制: 只有管理员可以删除订单
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          code: 403,
          message: '无权删除订单',
          data: null
        })
      }

      // 删除订单明细
      await db.OrderItem.destroy({
        where: { orderId: { [Op.in]: ids } }
      })

      // 删除订单
      const deletedCount = await db.Order.destroy({
        where: { id: { [Op.in]: ids } }
      })

      res.json({
        code: 200,
        message: `成功删除 ${deletedCount} 个订单`,
        data: { deletedCount }
      })
    } catch (err) {
      logger.error('批量删除订单失败:', err)
      res.status(500).json({
        code: 500,
        message: '批量删除订单失败',
        data: null
      })
    }
  }

  /**
   * 内部方法: 结算订单佣金
   */
  async _settleCommission(order) {
    const t = await db.sequelize.transaction()

    try {
      // 1. 查询团长信息
      const leader = await db.Leader.findByPk(order.leaderId, { transaction: t })
      if (!leader) {
        throw new Error('团长不存在')
      }

      // 2. 计算佣金(如果还没计算)
      if (order.commissionAmount === 0) {
        const commissionAmount = (parseFloat(order.totalAmount) * leader.commissionRate / 100).toFixed(2)
        await order.update({ commissionAmount }, { transaction: t })
      }

      // 3. 增加团长余额
      await leader.increment('balance', { 
        by: parseFloat(order.commissionAmount), 
        transaction: t 
      })

      // 4. 增加团长累计佣金
      await leader.increment('totalCommission', { 
        by: parseFloat(order.commissionAmount), 
        transaction: t 
      })

      // 5. 增加团长订单数
      await leader.increment('totalOrders', { by: 1, transaction: t })

      // 6. 记录佣金流水
      await db.Commission.create({
        leaderId: order.leaderId,
        orderId: order.id,
        amount: order.commissionAmount,
        type: 'order',
        status: 'settled',
        settledAt: new Date()
      }, { transaction: t })

      await t.commit()
      logger.info(`订单 ${order.orderNo} 佣金结算成功: ${order.commissionAmount}元`)
    } catch (err) {
      await t.rollback()
      logger.error('佣金结算失败:', err)
      throw err
    }
  }
}

module.exports = new OrderController()
