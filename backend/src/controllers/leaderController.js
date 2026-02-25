const db = require('../models')
const { Op } = require('sequelize')
const logger = require('../utils/logger')

/**
 * 团长管理控制器
 */
class LeaderController {
  /**
   * 获取团长列表(分页 + 搜索)
   */
  async getLeaders(req, res) {
    try {
      const {
        page = 1,
        pageSize = 10,
        keyword = '',
        status = '',
        communityId = ''
      } = req.query

      const offset = (page - 1) * pageSize
      const limit = parseInt(pageSize)

      // 构建查询条件
      const where = {}

      // 关键词搜索(团长姓名/手机号)
      if (keyword) {
        where[Op.or] = [
          { name: { [Op.like]: `%${keyword}%` } },
          { phone: { [Op.like]: `%${keyword}%` } }
        ]
      }

      // 状态筛选
      if (status !== '') {
        where.status = parseInt(status)
      }

      // 社区筛选
      if (communityId) {
        where.communityId = parseInt(communityId)
      }

      // 查询团长列表(关联社区和用户信息)
      const { count, rows } = await db.Leader.findAndCountAll({
        where,
        offset,
        limit,
        order: [['created_at', 'DESC']],
        include: [
          {
            model: db.Community,
            as: 'community',
            attributes: ['id', 'name', 'address']
          },
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'username', 'role']
          }
        ],
        distinct: true
      })

      // 转换为普通对象
      const plainRows = rows.map(row => row.get({ plain: true }))

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
      logger.error('获取团长列表失败:', err)
      res.status(500).json({
        code: 500,
        message: '获取团长列表失败: ' + err.message,
        data: null
      })
    }
  }

  /**
   * 获取团长详情
   */
  async getLeaderById(req, res) {
    try {
      const { id } = req.params

      const leader = await db.Leader.findByPk(id, {
        include: [
          {
            model: db.Community,
            as: 'community',
            attributes: ['id', 'name', 'address']
          },
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'username']
          }
        ]
      })

      if (!leader) {
        return res.status(404).json({
          code: 404,
          message: '团长不存在',
          data: null
        })
      }

      res.json({
        code: 200,
        message: '获取成功',
        data: leader.get({ plain: true })
      })
    } catch (err) {
      logger.error('获取团长详情失败:', err)
      res.status(500).json({
        code: 500,
        message: '获取团长详情失败: ' + err.message,
        data: null
      })
    }
  }

  /**
   * 创建团长
   */
  async createLeader(req, res) {
    try {
      const {
        username,
        password,
        name,
        phone,
        communityId,
        commissionRate
      } = req.body

      // 参数验证
      if (!username || !password || !name || !phone) {
        return res.status(400).json({
          code: 400,
          message: '用户名、密码、姓名、手机号不能为空',
          data: null
        })
      }

      // 检查用户名是否已存在
      const existingUser = await db.User.findOne({ where: { username } })
      if (existingUser) {
        return res.status(400).json({
          code: 400,
          message: '用户名已存在',
          data: null
        })
      }

      // 检查手机号是否已存在
      const existingLeader = await db.Leader.findOne({ where: { phone } })
      if (existingLeader) {
        return res.status(400).json({
          code: 400,
          message: '手机号已存在',
          data: null
        })
      }

      // 开启事务
      const result = await db.sequelize.transaction(async (t) => {
        // 1. 创建用户账号
        const bcrypt = require('bcrypt')
        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await db.User.create({
          username,
          password: hashedPassword,
          role: 'leader'
        }, { transaction: t })

        // 2. 创建团长信息
        const leader = await db.Leader.create({
          userId: user.id,
          communityId: communityId || null,
          name,
          phone,
          commissionRate: commissionRate || 12.00,
          balance: 0,
          totalOrders: 0,
          totalCommission: 0,
          status: 1
        }, { transaction: t })

        return { user, leader }
      })

      logger.info(`创建团长成功: ${name} (${username})`)

      res.json({
        code: 200,
        message: '创建成功',
        data: {
          id: result.leader.id,
          userId: result.user.id,
          username: result.user.username,
          name: result.leader.name,
          phone: result.leader.phone
        }
      })
    } catch (err) {
      logger.error('创建团长失败:', err)
      res.status(500).json({
        code: 500,
        message: '创建团长失败: ' + err.message,
        data: null
      })
    }
  }

  /**
   * 更新团长信息
   */
  async updateLeader(req, res) {
    try {
      const { id } = req.params
      const {
        name,
        phone,
        communityId,
        commissionRate,
        status
      } = req.body

      const leader = await db.Leader.findByPk(id)
      if (!leader) {
        return res.status(404).json({
          code: 404,
          message: '团长不存在',
          data: null
        })
      }

      // 检查手机号是否被其他团长使用
      if (phone && phone !== leader.phone) {
        const existingLeader = await db.Leader.findOne({
          where: {
            phone,
            id: { [Op.ne]: id }
          }
        })
        if (existingLeader) {
          return res.status(400).json({
            code: 400,
            message: '手机号已被其他团长使用',
            data: null
          })
        }
      }

      // 更新团长信息
      await leader.update({
        name: name || leader.name,
        phone: phone || leader.phone,
        communityId: communityId !== undefined ? communityId : leader.communityId,
        commissionRate: commissionRate !== undefined ? commissionRate : leader.commissionRate,
        status: status !== undefined ? status : leader.status
      })

      logger.info(`更新团长成功: ID=${id}, ${leader.name}`)

      res.json({
        code: 200,
        message: '更新成功',
        data: leader.get({ plain: true })
      })
    } catch (err) {
      logger.error('更新团长失败:', err)
      res.status(500).json({
        code: 500,
        message: '更新团长失败: ' + err.message,
        data: null
      })
    }
  }

  /**
   * 删除团长(软删除 - 设置状态为禁用)
   */
  async deleteLeader(req, res) {
    try {
      const { id } = req.params

      const leader = await db.Leader.findByPk(id)
      if (!leader) {
        return res.status(404).json({
          code: 404,
          message: '团长不存在',
          data: null
        })
      }

      // 检查是否有未完成的订单
      const pendingOrders = await db.Order.count({
        where: {
          leaderId: id,
          status: { [Op.in]: ['pending', 'confirmed', 'delivering', 'pickup'] }
        }
      })

      if (pendingOrders > 0) {
        return res.status(400).json({
          code: 400,
          message: `该团长还有 ${pendingOrders} 个未完成订单，无法删除`,
          data: null
        })
      }

      // 软删除：设置状态为禁用
      await leader.update({ status: 0 })

      logger.info(`禁用团长: ID=${id}, ${leader.name}`)

      res.json({
        code: 200,
        message: '删除成功',
        data: null
      })
    } catch (err) {
      logger.error('删除团长失败:', err)
      res.status(500).json({
        code: 500,
        message: '删除团长失败: ' + err.message,
        data: null
      })
    }
  }

  /**
   * 获取团长统计信息
   */
  async getLeaderStats(req, res) {
    try {
      const { id } = req.params

      const leader = await db.Leader.findByPk(id)
      if (!leader) {
        return res.status(404).json({
          code: 404,
          message: '团长不存在',
          data: null
        })
      }

      // 统计订单信息
      const orderStats = await db.Order.findAll({
        attributes: [
          'status',
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
          [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'totalAmount'],
          [db.sequelize.fn('SUM', db.sequelize.col('commission_amount')), 'totalCommission']
        ],
        where: { leaderId: id },
        group: ['status'],
        raw: true
      })

      // 近30天订单趋势
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentOrders = await db.Order.findAll({
        attributes: [
          [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
          [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
          [db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 'amount']
        ],
        where: {
          leaderId: id,
          created_at: { [Op.gte]: thirtyDaysAgo }
        },
        group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
        order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']],
        raw: true
      })

      res.json({
        code: 200,
        message: '获取成功',
        data: {
          leader: leader.get({ plain: true }),
          orderStats,
          recentOrders
        }
      })
    } catch (err) {
      logger.error('获取团长统计信息失败:', err)
      res.status(500).json({
        code: 500,
        message: '获取统计信息失败: ' + err.message,
        data: null
      })
    }
  }

  /**
   * 获取团长业绩排行榜
   */
  async getLeaderRanking(req, res) {
    try {
      const { type = 'orders', limit = 10 } = req.query

      let orderBy
      switch (type) {
        case 'orders':
          orderBy = [['total_orders', 'DESC']]
          break
        case 'amount':
          orderBy = [['total_amount', 'DESC']]
          break
        case 'commission':
          orderBy = [['total_commission', 'DESC']]
          break
        default:
          orderBy = [['total_orders', 'DESC']]
      }

      const leaders = await db.Leader.findAll({
        where: { status: 1 },
        order: orderBy,
        limit: parseInt(limit),
        include: [
          {
            model: db.Community,
            as: 'community',
            attributes: ['name']
          }
        ]
      })

      res.json({
        code: 200,
        message: '获取成功',
        data: leaders.map(l => l.get({ plain: true }))
      })
    } catch (err) {
      logger.error('获取团长排行榜失败:', err)
      res.status(500).json({
        code: 500,
        message: '获取排行榜失败: ' + err.message,
        data: null
      })
    }
  }
}

module.exports = new LeaderController()
