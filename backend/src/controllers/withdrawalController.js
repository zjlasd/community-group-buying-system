const db = require('../models')
const { Op } = require('sequelize')
const { success, error } = require('../utils/response')

/**
 * 提现管理控制器
 */

/**
 * 获取提现申请列表
 * GET /api/withdrawals
 */
exports.getWithdrawals = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      status,
      leaderId,
      startDate,
      endDate
    } = req.query

    // 构建查询条件
    const where = {}

    // 团长筛选（团长只能查看自己的）
    if (req.user.role === 'leader') {
      const leader = await db.Leader.findOne({ where: { userId: req.user.id } })
      if (!leader) {
        return res.json(error('团长信息不存在', 404))
      }
      where.leaderId = leader.id
    } else if (leaderId) {
      where.leaderId = leaderId
    }

    // 状态筛选
    if (status) {
      where.status = status
    }

    // 日期范围筛选
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    } else if (startDate) {
      where.created_at = {
        [Op.gte]: new Date(startDate)
      }
    } else if (endDate) {
      where.created_at = {
        [Op.lte]: new Date(endDate)
      }
    }

    // 分页查询
    const offset = (page - 1) * pageSize
    const { count, rows } = await db.Withdrawal.findAndCountAll({
      where,
      include: [
        {
          model: db.Leader,
          as: 'leader',
          attributes: ['id', 'name', 'phone', 'balance'],
          include: [{
            model: db.Community,
            as: 'community',
            attributes: ['id', 'name']
          }]
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: offset
    })

    // 格式化返回数据，确保前端能正确读取字段
    // 注意：Sequelize 已经将数据库字段（如 account_name）转换为驼峰命名（accountName）
    const list = rows.map(row => ({
      id: row.id,
      leaderId: row.leaderId,           // Sequelize自动转换
      amount: row.amount,
      accountName: row.accountName,     // Sequelize自动转换
      accountNumber: row.accountNumber, // Sequelize自动转换
      status: row.status,
      remark: row.remark,
      rejectReason: row.rejectReason,   // Sequelize自动转换
      createdAt: row.created_at,        // 这个字段是timestamps，需要从原始字段获取
      reviewedAt: row.reviewedAt,       // Sequelize自动转换
      leader: row.leader
    }))

    res.json(success({
      list,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }))
  } catch (err) {
    console.error('获取提现申请列表失败:', err)
    res.json(error('获取提现申请列表失败'))
  }
}

/**
 * 获取提现统计数据
 * GET /api/withdrawals/stats
 */
exports.getWithdrawalStats = async (req, res) => {
  try {
    const { leaderId } = req.query

    // 构建查询条件
    const where = {}
    let leader = null

    // 团长筛选
    if (req.user.role === 'leader') {
      leader = await db.Leader.findOne({ where: { userId: req.user.id } })
      if (!leader) {
        return res.json(error('团长信息不存在', 404))
      }
      where.leaderId = leader.id
    } else if (leaderId) {
      where.leaderId = leaderId
      leader = await db.Leader.findByPk(leaderId)
    }

    // 账户余额（从团长表获取）
    const balance = leader ? parseFloat(leader.balance) || 0 : 0

    // 提现中金额（status='pending'待审核）
    const pendingResult = await db.Withdrawal.sum('amount', {
      where: { ...where, status: 'pending' }
    })
    const pending = parseFloat(pendingResult) || 0

    // 累计提现（status='approved'已通过）
    const totalResult = await db.Withdrawal.sum('amount', {
      where: { ...where, status: 'approved' }
    })
    const total = parseFloat(totalResult) || 0

    // 可提现金额 = 账户余额 - 提现中金额
    const available = balance - pending

    res.json(success({
      balance: balance,
      available: available >= 0 ? available : 0,
      pending: pending,
      total: total
    }))
  } catch (err) {
    console.error('获取提现统计失败:', err)
    res.json(error('获取提现统计失败'))
  }
}

/**
 * 获取提现详情
 * GET /api/withdrawals/:id
 */
exports.getWithdrawalById = async (req, res) => {
  try {
    const { id } = req.params

    const withdrawal = await db.Withdrawal.findByPk(id, {
      include: [
        {
          model: db.Leader,
          as: 'leader',
          attributes: ['id', 'name', 'phone', 'balance'],
          include: [{
            model: db.Community,
            as: 'community',
            attributes: ['id', 'name']
          }]
        }
      ]
    })

    if (!withdrawal) {
      return res.json(error('提现申请不存在', 404))
    }

    // 权限检查：团长只能查看自己的提现申请
    if (req.user.role === 'leader') {
      const leader = await db.Leader.findOne({ where: { userId: req.user.id } })
      if (!leader || withdrawal.leaderId !== leader.id) {
        return res.json(error('无权访问该提现申请', 403))
      }
    }

    res.json(success(withdrawal))
  } catch (err) {
    console.error('获取提现详情失败:', err)
    res.json(error('获取提现详情失败'))
  }
}

/**
 * 创建提现申请（团长）
 * POST /api/withdrawals
 */
exports.createWithdrawal = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const { amount, accountName, accountNumber } = req.body

    // 参数验证
    if (!amount || !accountName || !accountNumber) {
      return res.json(error('提现金额、账户名和账号不能为空'))
    }

    if (parseFloat(amount) <= 0) {
      return res.json(error('提现金额必须大于0'))
    }

    // 获取团长信息
    const leader = await db.Leader.findOne({
      where: { userId: req.user.id }
    })

    if (!leader) {
      return res.json(error('团长信息不存在', 404))
    }

    // 检查余额是否足够
    if (parseFloat(leader.balance) < parseFloat(amount)) {
      return res.json(error('账户余额不足'))
    }

    // 检查是否有待审核的提现申请
    const pendingWithdrawal = await db.Withdrawal.findOne({
      where: {
        leaderId: leader.id,
        status: 'pending'
      }
    })

    if (pendingWithdrawal) {
      return res.json(error('您还有待审核的提现申请，请等待审核完成'))
    }

    // 创建提现申请
    const withdrawal = await db.Withdrawal.create({
      leaderId: leader.id,
      amount: parseFloat(amount),
      accountName,
      accountNumber,
      status: 'pending'
    }, { transaction })

    // 冻结余额（从余额中扣除）
    await leader.decrement({
      balance: parseFloat(amount)
    }, { transaction })

    await transaction.commit()

    res.json(success({
      id: withdrawal.id,
      message: '提现申请提交成功，请等待审核'
    }))
  } catch (err) {
    await transaction.rollback()
    console.error('创建提现申请失败:', err)
    res.json(error('创建提现申请失败'))
  }
}

/**
 * 审核提现申请（管理员）
 * POST /api/withdrawals/:id/review
 */
exports.reviewWithdrawal = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const { id } = req.params
    const { status, rejectReason } = req.body

    // 参数验证
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.json(error('审核状态无效'))
    }

    if (status === 'rejected' && !rejectReason) {
      return res.json(error('拒绝原因不能为空'))
    }

    // 查询提现申请
    const withdrawal = await db.Withdrawal.findByPk(id, {
      include: [{
        model: db.Leader,
        as: 'leader'
      }]
    })

    if (!withdrawal) {
      return res.json(error('提现申请不存在', 404))
    }

    if (withdrawal.status !== 'pending') {
      return res.json(error('该提现申请已审核'))
    }

    // 更新提现申请状态
    await withdrawal.update({
      status,
      rejectReason: status === 'rejected' ? rejectReason : null,
      reviewedAt: new Date()
    }, { transaction })

    // 如果拒绝，返还余额
    if (status === 'rejected') {
      await withdrawal.leader.increment({
        balance: parseFloat(withdrawal.amount)
      }, { transaction })
    }

    await transaction.commit()

    res.json(success({
      message: status === 'approved' ? '提现申请已通过' : '提现申请已拒绝'
    }))
  } catch (err) {
    await transaction.rollback()
    console.error('审核提现申请失败:', err)
    res.json(error('审核提现申请失败'))
  }
}

/**
 * 取消提现申请（团长）
 * POST /api/withdrawals/:id/cancel
 */
exports.cancelWithdrawal = async (req, res) => {
  const transaction = await db.sequelize.transaction()

  try {
    const { id } = req.params

    // 获取团长信息
    const leader = await db.Leader.findOne({
      where: { userId: req.user.id }
    })

    if (!leader) {
      return res.json(error('团长信息不存在', 404))
    }

    // 查询提现申请
    const withdrawal = await db.Withdrawal.findByPk(id)

    if (!withdrawal) {
      return res.json(error('提现申请不存在', 404))
    }

    // 权限检查
    if (withdrawal.leaderId !== leader.id) {
      return res.json(error('无权操作该提现申请', 403))
    }

    // 只能取消待审核的申请
    if (withdrawal.status !== 'pending') {
      return res.json(error('只能取消待审核的提现申请'))
    }

    // 更新状态为已拒绝
    await withdrawal.update({
      status: 'rejected',
      rejectReason: '团长取消申请',
      reviewedAt: new Date()
    }, { transaction })

    // 返还余额
    await leader.increment({
      balance: parseFloat(withdrawal.amount)
    }, { transaction })

    await transaction.commit()

    res.json(success({
      message: '提现申请已取消'
    }))
  } catch (err) {
    await transaction.rollback()
    console.error('取消提现申请失败:', err)
    res.json(error('取消提现申请失败'))
  }
}

module.exports = exports
