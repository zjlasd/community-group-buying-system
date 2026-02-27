const db = require('../models')
const { Op } = require('sequelize')
const { success, error } = require('../utils/response')

/**
 * 客户管理控制器（团长端）
 */

/**
 * 获取团长的客户列表
 * GET /api/customers
 */
exports.getCustomers = async (req, res) => {
  try {
    const leaderId = req.user.leaderId
    
    if (!leaderId) {
      return res.json(error('团长信息不存在'))
    }

    const {
      page = 1,
      pageSize = 10,
      keyword,
      tag
    } = req.query

    // 从订单中提取客户信息并统计
    const offset = (page - 1) * pageSize

    // 构建查询条件
    const where = {
      leader_id: leaderId
    }

    if (keyword) {
      where[Op.or] = [
        { customer_name: { [Op.like]: `%${keyword}%` } },
        { customer_phone: { [Op.like]: `%${keyword}%` } }
      ]
    }

    // 获取该团长的所有客户（按客户手机号分组）
    const customers = await db.Order.findAll({
      attributes: [
        [db.sequelize.fn('MAX', db.sequelize.col('customer_name')), 'customer_name'], // 使用MAX避免GROUP BY错误
        'customer_phone',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
        [db.sequelize.fn('MAX', db.sequelize.col('created_at')), 'lastOrderTime']
      ],
      where,
      group: ['customer_phone'],
      order: [[db.sequelize.literal('lastOrderTime'), 'DESC']],
      limit: parseInt(pageSize),
      offset: offset,
      raw: true
    })

    // 获取总数
    const totalResult = await db.sequelize.query(`
      SELECT COUNT(DISTINCT customer_phone) as total
      FROM orders
      WHERE leader_id = :leaderId
      ${keyword ? `AND (
        customer_name LIKE :keyword OR 
        customer_phone LIKE :keyword
      )` : ''}
    `, {
      replacements: {
        leaderId,
        keyword: `%${keyword || ''}%`
      },
      type: db.sequelize.QueryTypes.SELECT
    })

    const total = totalResult[0]?.total || 0

    // 格式化客户数据，自动打标签
    const customerList = customers.map(customer => {
      const orderCount = parseInt(customer.orderCount)
      const totalAmount = parseFloat(customer.totalAmount)
      const lastOrderTime = new Date(customer.lastOrderTime)
      const daysSinceLastOrder = Math.floor((Date.now() - lastOrderTime.getTime()) / (1000 * 60 * 60 * 24))

      // 自动打标签逻辑
      let customerTag = '普通客户'
      if (totalAmount >= 5000 || orderCount >= 30) {
        customerTag = 'VIP客户'
      } else if (daysSinceLastOrder <= 7 && orderCount >= 5) {
        customerTag = '活跃客户'
      } else if (daysSinceLastOrder > 30) {
        customerTag = '沉睡客户'
      }

      // 如果有标签筛选，过滤不符合的客户
      if (tag && customerTag !== tag) {
        return null
      }

      return {
        name: customer.customer_name,
        phone: customer.customer_phone,
        address: '-', // orders表中没有地址字段，默认显示'-'
        tag: customerTag,
        orderCount,
        totalAmount,
        lastOrderTime: customer.lastOrderTime,
        remark: '' // 可以后续扩展备注功能
      }
    }).filter(Boolean)

    // 统计客户标签分布
    const stats = await getCustomerStats(leaderId)

    res.json(success({
      list: customerList,
      total: parseInt(total),
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      stats
    }))
  } catch (err) {
    console.error('获取客户列表失败:', err)
    res.json(error('获取客户列表失败'))
  }
}

/**
 * 获取客户详情（包含订单记录）
 * GET /api/customers/:phone
 */
exports.getCustomerDetail = async (req, res) => {
  try {
    const leaderId = req.user.leaderId
    const { phone } = req.params

    if (!leaderId) {
      return res.json(error('团长信息不存在'))
    }

    // 获取客户的订单统计
    const customerStats = await db.Order.findOne({
      attributes: [
        [db.sequelize.fn('MAX', db.sequelize.col('customer_name')), 'customer_name'], // 使用MAX避免GROUP BY错误
        'customer_phone',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
        [db.sequelize.fn('MAX', db.sequelize.col('created_at')), 'lastOrderTime']
      ],
      where: {
        leader_id: leaderId,
        customer_phone: phone
      },
      group: ['customer_phone'],
      raw: true
    })

    if (!customerStats) {
      return res.json(error('客户不存在', 404))
    }

    // 获取客户最近5笔订单
    const orders = await db.Order.findAll({
      where: {
        leader_id: leaderId,
        customer_phone: phone
      },
      order: [['created_at', 'DESC']],
      limit: 5
    })

    const orderList = orders.map(order => ({
      orderNo: order.order_no,
      amount: parseFloat(order.total_amount),
      status: getOrderStatusText(order.status),
      createTime: order.created_at
    }))

    // 计算标签
    const orderCount = parseInt(customerStats.orderCount)
    const totalAmount = parseFloat(customerStats.totalAmount)
    const lastOrderTime = new Date(customerStats.lastOrderTime)
    const daysSinceLastOrder = Math.floor((Date.now() - lastOrderTime.getTime()) / (1000 * 60 * 60 * 24))

    let tag = '普通客户'
    if (totalAmount >= 5000 || orderCount >= 30) {
      tag = 'VIP客户'
    } else if (daysSinceLastOrder <= 7 && orderCount >= 5) {
      tag = '活跃客户'
    } else if (daysSinceLastOrder > 30) {
      tag = '沉睡客户'
    }

    res.json(success({
      name: customerStats.customer_name,
      phone: customerStats.customer_phone,
      address: '-', // orders表中没有地址字段
      tag,
      orderCount,
      totalAmount,
      lastOrderTime: customerStats.lastOrderTime,
      orders: orderList
    }))
  } catch (err) {
    console.error('获取客户详情失败:', err)
    res.json(error('获取客户详情失败'))
  }
}

/**
 * 获取客户统计（标签分布）
 */
async function getCustomerStats(leaderId) {
  try {
    // 获取所有客户
    const customers = await db.Order.findAll({
      attributes: [
        'customer_phone',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
        [db.sequelize.fn('MAX', db.sequelize.col('created_at')), 'lastOrderTime']
      ],
      where: {
        leader_id: leaderId
      },
      group: ['customer_phone'],
      raw: true
    })

    let totalCustomers = 0
    let activeCustomers = 0
    let sleepingCustomers = 0
    let vipCustomers = 0

    customers.forEach(customer => {
      totalCustomers++
      
      const orderCount = parseInt(customer.orderCount)
      const totalAmount = parseFloat(customer.totalAmount)
      const lastOrderTime = new Date(customer.lastOrderTime)
      const daysSinceLastOrder = Math.floor((Date.now() - lastOrderTime.getTime()) / (1000 * 60 * 60 * 24))

      if (totalAmount >= 5000 || orderCount >= 30) {
        vipCustomers++
      } else if (daysSinceLastOrder <= 7 && orderCount >= 5) {
        activeCustomers++
      } else if (daysSinceLastOrder > 30) {
        sleepingCustomers++
      } else {
        activeCustomers++ // 普通但活跃的客户
      }
    })

    return {
      total: totalCustomers,
      active: activeCustomers,
      sleeping: sleepingCustomers,
      vip: vipCustomers
    }
  } catch (err) {
    console.error('获取客户统计失败:', err)
    return {
      total: 0,
      active: 0,
      sleeping: 0,
      vip: 0
    }
  }
}

/**
 * 获取订单状态文本
 */
function getOrderStatusText(status) {
  const statusMap = {
    0: '待确认',
    1: '已确认',
    2: '配送中',
    3: '已完成',
    4: '已取消'
  }
  return statusMap[status] || '未知'
}

module.exports = exports
