const db = require('../models')
const { Op } = require('sequelize')
const { success, error } = require('../utils/response')

/**
 * 数据看板控制器
 */

/**
 * 获取管理员看板统计数据
 * GET /api/dashboard/admin
 */
exports.getAdminDashboard = async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // 今日订单数和销售额
    const todayOrders = await db.Order.count({
      where: {
        created_at: {
          [Op.gte]: today
        }
      }
    })

    const todaySales = await db.Order.sum('total_amount', {
      where: {
        created_at: {
          [Op.gte]: today
        }
      }
    }) || 0

    // 待审核提现数
    const pendingWithdrawals = await db.Withdrawal.count({
      where: {
        status: 'pending'
      }
    })

    // 活跃团长数（近30天有订单的团长）
    const activeLeaders = await db.Leader.count({
      where: {
        id: {
          [Op.in]: db.sequelize.literal(`(
            SELECT DISTINCT leader_id 
            FROM orders 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          )`)
        },
        status: 1
      }
    })

    // 近7天订单趋势
    const sevenDaysData = await getOrderTrend(7)
    
    // 近30天订单趋势
    const thirtyDaysData = await getOrderTrend(30)

    // 团长业绩排行（本月）
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const leaderRanking = await db.Leader.findAll({
      attributes: [
        'id',
        'name',
        'community_id',
        [db.sequelize.fn('COUNT', db.sequelize.col('orders.id')), 'orderCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('orders.total_amount')), 'totalSales'],
        [db.sequelize.fn('SUM', db.sequelize.col('orders.commission_amount')), 'totalCommission']
      ],
      include: [
        {
          model: db.Order,
          as: 'orders',
          attributes: [],
          where: {
            created_at: {
              [Op.gte]: monthStart
            }
          },
          required: true
        },
        {
          model: db.Community,
          as: 'community',
          attributes: ['name']
        }
      ],
      group: ['Leader.id', 'community.id'],
      order: [[db.sequelize.literal('totalSales'), 'DESC']],
      limit: 10,
      subQuery: false
    })

    const rankingList = leaderRanking.map(leader => ({
      name: leader.name,
      community: leader.community?.name || '-',
      orders: parseInt(leader.get('orderCount')) || 0,
      sales: parseFloat(leader.get('totalSales')) || 0,
      commission: parseFloat(leader.get('totalCommission')) || 0
    }))

    // 按商品分类统计销售额(用于饼图)
    const categorySales = await db.OrderItem.findAll({
      attributes: [
        [db.sequelize.col('product.category'), 'category'],
        [db.sequelize.fn('SUM', db.sequelize.literal('`OrderItem`.`quantity` * `OrderItem`.`product_price`')), 'totalSales']
      ],
      include: [{
        model: db.Product,
        as: 'product',
        attributes: [],
        where: {
          category: {
            [Op.ne]: null
          }
        }
      }, {
        model: db.Order,
        as: 'order',
        attributes: [],
        where: {
          created_at: {
            [Op.gte]: monthStart
          }
        }
      }],
      group: ['product.category'],
      raw: true
    })

    const salesByCategory = categorySales.map(item => ({
      name: item.category || '其他',
      value: parseFloat(item.totalSales) || 0
    }))

    res.json(success({
      stats: {
        todayOrders,
        todaySales: parseFloat(todaySales.toFixed(2)),
        pendingWithdrawals,
        activeLeaders
      },
      trends: {
        week: sevenDaysData,
        month: thirtyDaysData
      },
      leaderRanking: rankingList,
      salesByCategory
    }))
  } catch (err) {
    console.error('获取管理员看板数据失败:', err)
    res.json(error('获取看板数据失败'))
  }
}

/**
 * 获取团长个人看板统计数据
 * GET /api/dashboard/leader
 */
exports.getLeaderDashboard = async (req, res) => {
  try {
    const leaderId = req.user.leaderId

    if (!leaderId) {
      return res.json(error('团长信息不存在'))
    }

    // 获取团长信息
    const leader = await db.Leader.findByPk(leaderId, {
      include: [{
        model: db.Community,
        as: 'community',
        attributes: ['name']
      }]
    })

    if (!leader) {
      return res.json(error('团长不存在'))
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    // 今日收益和订单
    const todayStats = await db.Order.findOne({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('commission_amount')), 'income']
      ],
      where: {
        leader_id: leaderId,
        created_at: {
          [Op.gte]: today
        }
      },
      raw: true
    })

    // 本月收益和订单
    const monthStats = await db.Order.findOne({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount'],
        [db.sequelize.fn('SUM', db.sequelize.col('commission_amount')), 'income']
      ],
      where: {
        leader_id: leaderId,
        created_at: {
          [Op.gte]: monthStart
        }
      },
      raw: true
    })

    // 客户数量（去重）
    const customerCount = await db.Order.count({
      distinct: true,
      col: 'customer_name',
      where: {
        leader_id: leaderId
      }
    })

    // 近7天和30天订单趋势
    const trend7Days = await getLeaderOrderTrend(leaderId, 7)
    const trend30Days = await getLeaderOrderTrend(leaderId, 30)

    // 最近5笔订单
    const recentOrders = await db.Order.findAll({
      where: {
        leader_id: leaderId
      },
      order: [['created_at', 'DESC']],
      limit: 5
    })

    // 状态映射
    const statusMap = {
      'pending': 0,
      'confirmed': 1,
      'delivering': 2,
      'pickup': 3,
      'completed': 4,
      'cancelled': 5
    }

    const orderList = recentOrders.map(order => ({
      orderNo: order.orderNo,
      customerName: order.customerName,
      amount: parseFloat(order.totalAmount),
      commission: parseFloat(order.commissionAmount),
      status: statusMap[order.status] ?? 0,
      createTime: order.created_at
    }))

    // 安全转换数值的辅助函数
    const safeParseFloat = (value, defaultValue = 0) => {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? defaultValue : parsed
    }

    const responseData = {
      stats: {
        todayIncome: safeParseFloat(todayStats?.income, 0).toFixed(2),
        todayOrders: parseInt(todayStats?.orderCount || 0),
        monthIncome: safeParseFloat(monthStats?.income, 0).toFixed(2),
        monthOrders: parseInt(monthStats?.orderCount || 0),
        totalIncome: safeParseFloat(leader.total_commission, 0).toFixed(2),
        totalOrders: leader.total_orders || 0,
        balance: safeParseFloat(leader.balance, 0).toFixed(2),
        commissionRate: safeParseFloat(leader.commission_rate, 0.12),
        community: leader.community?.name || '-',
        customers: customerCount
      },
      trends: {
        '7': trend7Days,
        '30': trend30Days
      },
      recentOrders: orderList
    }
    
    res.json(success(responseData))
  } catch (err) {
    console.error('获取团长看板数据失败:', err)
    res.json(error('获取看板数据失败'))
  }
}

/**
 * 获取订单趋势数据（管理员）
 */
async function getOrderTrend(days) {
  const dates = []
  const orders = []
  const sales = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    // 日期标签
    if (days === 7) {
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      dates.push(weekDays[date.getDay()])
    } else {
      dates.push(`${date.getMonth() + 1}/${date.getDate()}`)
    }

    // 订单数
    const orderCount = await db.Order.count({
      where: {
        created_at: {
          [Op.gte]: date,
          [Op.lt]: nextDate
        }
      }
    })
    orders.push(orderCount)

    // 销售额
    const salesAmount = await db.Order.sum('total_amount', {
      where: {
        created_at: {
          [Op.gte]: date,
          [Op.lt]: nextDate
        }
      }
    }) || 0
    sales.push(parseFloat(salesAmount.toFixed(2)))
  }

  return { dates, orders, sales }
}

/**
 * 获取团长订单趋势数据
 */
async function getLeaderOrderTrend(leaderId, days) {
  const dates = []
  const orders = []
  const sales = []

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(date)
    nextDate.setDate(nextDate.getDate() + 1)

    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    dates.push(weekDays[date.getDay()])

    // 订单数
    const orderCount = await db.Order.count({
      where: {
        leader_id: leaderId,
        created_at: {
          [Op.gte]: date,
          [Op.lt]: nextDate
        }
      }
    })
    orders.push(orderCount)

    // 销售额
    const salesAmount = await db.Order.sum('total_amount', {
      where: {
        leader_id: leaderId,
        created_at: {
          [Op.gte]: date,
          [Op.lt]: nextDate
        }
      }
    }) || 0
    sales.push(parseFloat(salesAmount.toFixed(2)))
  }

  return { dates, orders, sales }
}

module.exports = exports
