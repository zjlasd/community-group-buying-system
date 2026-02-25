const db = require('../models')
const { Op } = require('sequelize')
const { success, error } = require('../utils/response')

/**
 * 佣金管理控制器
 */

/**
 * 获取佣金记录列表
 * GET /api/commissions
 */
exports.getCommissions = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      leaderId,
      type,
      status,
      startDate,
      endDate
    } = req.query

    // 构建查询条件
    const where = {}

    // 团长筛选（管理员可以查看所有团长，团长只能查看自己的）
    if (req.user.role === 'leader') {
      // 团长只能查看自己的佣金
      const leader = await db.Leader.findOne({ where: { userId: req.user.id } })
      if (!leader) {
        return res.json(error('团长信息不存在', 404))
      }
      where.leaderId = leader.id
    } else if (leaderId) {
      // 管理员可以按团长ID筛选
      where.leaderId = leaderId
    }

    // 类型筛选
    if (type) {
      where.type = type
    }

    // 状态筛选
    if (status) {
      where.status = status
    }

    // 日期范围筛选
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    } else if (startDate) {
      where.createdAt = {
        [Op.gte]: new Date(startDate)
      }
    } else if (endDate) {
      where.createdAt = {
        [Op.lte]: new Date(endDate)
      }
    }

    // 分页查询
    const offset = (page - 1) * pageSize
    const { count, rows } = await db.Commission.findAndCountAll({
      where,
      include: [
        {
          model: db.Leader,
          as: 'leader',
          attributes: ['id', 'name', 'phone'],
          required: false
        },
        {
          model: db.Order,
          as: 'order',
          attributes: ['id', 'orderNo', 'totalAmount'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: offset
    })

    res.json(success({
      list: rows,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }))
  } catch (err) {
    console.error('获取佣金记录失败:', err)
    res.json(error('获取佣金记录失败'))
  }
}

/**
 * 获取佣金统计数据
 * GET /api/commissions/stats
 */
exports.getCommissionStats = async (req, res) => {
  try {
    const { leaderId, startDate, endDate } = req.query

    // 构建查询条件
    const where = {}

    // 团长筛选
    if (req.user.role === 'leader') {
      const leader = await db.Leader.findOne({ where: { userId: req.user.id } })
      if (!leader) {
        return res.json(error('团长信息不存在', 404))
      }
      where.leaderId = leader.id
    } else if (leaderId) {
      where.leaderId = leaderId
    }

    // 日期范围
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    }

    // 统计数据
    const stats = await db.Commission.findAll({
      where,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalAmount']
      ],
      group: ['status']
    })

    // 类型统计
    const typeStats = await db.Commission.findAll({
      where,
      attributes: [
        'type',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalAmount']
      ],
      group: ['type']
    })

    res.json(success({
      statusStats: stats,
      typeStats: typeStats
    }))
  } catch (err) {
    console.error('获取佣金统计失败:', err)
    res.json(error('获取佣金统计失败'))
  }
}

/**
 * 获取佣金详情
 * GET /api/commissions/:id
 */
exports.getCommissionById = async (req, res) => {
  try {
    const { id } = req.params

    const commission = await db.Commission.findByPk(id, {
      include: [
        {
          model: db.Leader,
          as: 'leader',
          attributes: ['id', 'name', 'phone'],
          include: [{
            model: db.Community,
            as: 'community',
            attributes: ['id', 'name']
          }]
        },
        {
          model: db.Order,
          as: 'order',
          attributes: ['id', 'orderNo', 'totalAmount', 'status']
        }
      ]
    })

    if (!commission) {
      return res.json(error('佣金记录不存在', 404))
    }

    // 权限检查：团长只能查看自己的佣金
    if (req.user.role === 'leader') {
      const leader = await db.Leader.findOne({ where: { userId: req.user.id } })
      if (!leader || commission.leaderId !== leader.id) {
        return res.json(error('无权访问该佣金记录', 403))
      }
    }

    res.json(success(commission))
  } catch (err) {
    console.error('获取佣金详情失败:', err)
    res.json(error('获取佣金详情失败'))
  }
}

/**
 * 创建佣金调整记录（仅管理员）
 * POST /api/commissions/adjustment
 */
exports.createAdjustment = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const { leaderId, amount, remark } = req.body

    // 参数验证
    if (!leaderId || !amount) {
      return res.json(error('团长ID和金额不能为空'))
    }

    // 检查团长是否存在
    const leader = await db.Leader.findByPk(leaderId)
    if (!leader) {
      return res.json(error('团长不存在', 404))
    }

    // 创建佣金调整记录
    const commission = await db.Commission.create({
      leaderId,
      orderId: null,
      amount: parseFloat(amount),
      type: 'adjustment',
      status: 'settled',
      remark: remark || '管理员手动调整'
    }, { transaction })

    // 更新团长账户余额和累计佣金
    await leader.increment({
      balance: parseFloat(amount),
      totalCommission: parseFloat(amount) > 0 ? parseFloat(amount) : 0
    }, { transaction })

    await transaction.commit()

    res.json(success({
      id: commission.id,
      message: '佣金调整成功'
    }))
  } catch (err) {
    await transaction.rollback()
    console.error('创建佣金调整记录失败:', err)
    res.json(error('创建佣金调整记录失败'))
  }
}

/**
 * 批量结算佣金（仅管理员）
 * POST /api/commissions/batch/settle
 */
exports.batchSettle = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const { ids } = req.body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json(error('请选择要结算的佣金记录'))
    }

    // 查询待结算的佣金记录
    const commissions = await db.Commission.findAll({
      where: {
        id: { [Op.in]: ids },
        status: 'pending'
      }
    })

    if (commissions.length === 0) {
      return res.json(error('没有可结算的佣金记录'))
    }

    // 按团长分组统计
    const leaderAmounts = {}
    commissions.forEach(commission => {
      if (!leaderAmounts[commission.leaderId]) {
        leaderAmounts[commission.leaderId] = 0
      }
      leaderAmounts[commission.leaderId] += parseFloat(commission.amount)
    })

    // 批量更新佣金状态
    await db.Commission.update(
      { status: 'settled' },
      {
        where: { id: { [Op.in]: ids } },
        transaction
      }
    )

    // 更新团长账户余额
    for (const [leaderId, amount] of Object.entries(leaderAmounts)) {
      await db.Leader.increment(
        { balance: amount },
        {
          where: { id: leaderId },
          transaction
        }
      )
    }

    await transaction.commit()

    res.json(success({
      settledCount: commissions.length,
      message: `成功结算${commissions.length}条佣金记录`
    }))
  } catch (err) {
    await transaction.rollback()
    console.error('批量结算佣金失败:', err)
    res.json(error('批量结算佣金失败'))
  }
}

module.exports = exports
