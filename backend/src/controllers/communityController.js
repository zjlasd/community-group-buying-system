const db = require('../models')
const { Op } = require('sequelize')
const { success, error } = require('../utils/response')

/**
 * 社区管理控制器
 */

/**
 * 获取社区列表
 * GET /api/communities
 */
exports.getCommunities = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      district
    } = req.query

    // 构建查询条件
    const where = {}

    // 关键词搜索（社区名称或地址）
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { address: { [Op.like]: `%${keyword}%` } }
      ]
    }

    // 区域筛选
    if (district) {
      where.district = district
    }

    // 分页查询
    const offset = (page - 1) * pageSize
    const { count, rows } = await db.Community.findAndCountAll({
      where,
      include: [{
        model: db.Leader,
        as: 'leaders',
        attributes: ['id', 'name', 'phone', 'status']
      }],
      distinct: true,  // 修复: 使用 distinct 确保只统计社区数量，不受关联表影响
      order: [['created_at', 'DESC']],
      limit: parseInt(pageSize),
      offset: offset
    })

    // 格式化返回数据，确保前端能正确读取字段
    const list = rows.map(row => ({
      id: row.id,
      name: row.name,
      address: row.address,
      district: row.district,
      createdAt: row.created_at,  // 将 created_at 映射为 createdAt
      leaders: row.leaders || []
    }))

    res.json(success({
      list,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }))
  } catch (err) {
    console.error('获取社区列表失败:', err)
    res.json(error('获取社区列表失败'))
  }
}

/**
 * 获取所有社区（不分页，用于下拉选择）
 * GET /api/communities/all
 */
exports.getAllCommunities = async (req, res) => {
  try {
    const communities = await db.Community.findAll({
      attributes: ['id', 'name', 'district'],
      order: [['name', 'ASC']]
    })

    res.json(success(communities))
  } catch (err) {
    console.error('获取社区列表失败:', err)
    res.json(error('获取社区列表失败'))
  }
}

/**
 * 获取社区详情
 * GET /api/communities/:id
 */
exports.getCommunityById = async (req, res) => {
  try {
    const { id } = req.params

    const community = await db.Community.findByPk(id, {
      include: [{
        model: db.Leader,
        as: 'leaders',
        attributes: ['id', 'name', 'phone', 'status', 'totalOrders', 'totalAmount']
      }]
    })

    if (!community) {
      return res.json(error('社区不存在', 404))
    }

    res.json(success(community))
  } catch (err) {
    console.error('获取社区详情失败:', err)
    res.json(error('获取社区详情失败'))
  }
}

/**
 * 创建社区（管理员）
 * POST /api/communities
 */
exports.createCommunity = async (req, res) => {
  try {
    const { name, address, district } = req.body

    // 参数验证
    if (!name) {
      return res.json(error('社区名称不能为空'))
    }

    // 检查社区名称是否已存在
    const existingCommunity = await db.Community.findOne({
      where: { name }
    })

    if (existingCommunity) {
      return res.json(error('社区名称已存在'))
    }

    // 创建社区
    const community = await db.Community.create({
      name,
      address: address || null,
      district: district || null
    })

    res.json(success({
      id: community.id,
      message: '社区创建成功'
    }))
  } catch (err) {
    console.error('创建社区失败:', err)
    res.json(error('创建社区失败'))
  }
}

/**
 * 更新社区信息（管理员）
 * PUT /api/communities/:id
 */
exports.updateCommunity = async (req, res) => {
  try {
    const { id } = req.params
    const { name, address, district } = req.body

    // 查询社区
    const community = await db.Community.findByPk(id)

    if (!community) {
      return res.json(error('社区不存在', 404))
    }

    // 如果修改了名称，检查是否重复
    if (name && name !== community.name) {
      const existingCommunity = await db.Community.findOne({
        where: {
          name,
          id: { [Op.ne]: id }
        }
      })

      if (existingCommunity) {
        return res.json(error('社区名称已存在'))
      }
    }

    // 更新社区信息
    await community.update({
      name: name || community.name,
      address: address !== undefined ? address : community.address,
      district: district !== undefined ? district : community.district
    })

    res.json(success({
      message: '社区信息更新成功'
    }))
  } catch (err) {
    console.error('更新社区信息失败:', err)
    res.json(error('更新社区信息失败'))
  }
}

/**
 * 删除社区（管理员）
 * DELETE /api/communities/:id
 */
exports.deleteCommunity = async (req, res) => {
  try {
    const { id } = req.params

    // 查询社区
    const community = await db.Community.findByPk(id, {
      include: [{
        model: db.Leader,
        as: 'leaders'
      }]
    })

    if (!community) {
      return res.json(error('社区不存在', 404))
    }

    // 检查是否有关联的团长
    if (community.leaders && community.leaders.length > 0) {
      return res.json(error('该社区下还有团长，无法删除'))
    }

    // 删除社区
    await community.destroy()

    res.json(success({
      message: '社区删除成功'
    }))
  } catch (err) {
    console.error('删除社区失败:', err)
    res.json(error('删除社区失败'))
  }
}

/**
 * 获取区域列表（用于筛选）
 * GET /api/communities/meta/districts
 */
exports.getDistricts = async (req, res) => {
  try {
    const districts = await db.Community.findAll({
      attributes: [
        [db.sequelize.fn('DISTINCT', db.sequelize.col('district')), 'district']
      ],
      where: {
        district: { [Op.ne]: null }
      },
      raw: true
    })

    const districtList = districts.map(d => d.district).filter(d => d)

    res.json(success(districtList))
  } catch (err) {
    console.error('获取区域列表失败:', err)
    res.json(error('获取区域列表失败'))
  }
}

/**
 * 获取区域统计（社区数量分布）
 * GET /api/communities/areas
 */
exports.getCommunityAreas = async (req, res) => {
  try {
    const areas = await db.Community.findAll({
      attributes: [
        'district',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
      ],
      where: {
        district: { [Op.ne]: null }
      },
      group: ['district'],
      raw: true
    })

    const areaList = areas.map(area => ({
      area: area.district,
      count: parseInt(area.count)
    }))

    res.json(success(areaList))
  } catch (err) {
    console.error('获取区域统计失败:', err)
    res.json(error('获取区域统计失败'))
  }
}

/**
 * 获取社区下的团长列表
 * GET /api/communities/:id/leaders
 */
exports.getCommunityLeaders = async (req, res) => {
  try {
    const { id } = req.params

    // 检查社区是否存在
    const community = await db.Community.findByPk(id)
    if (!community) {
      return res.json(error('社区不存在', 404))
    }

    // 查询该社区下的团长
    const leaders = await db.Leader.findAll({
      where: {
        community_id: id
      },
      attributes: [
        'id',
        'name',
        'phone',
        'status',
        'total_orders',
        'total_commission'
      ],
      raw: true
    })

    // 转换字段名为驼峰格式
    const leaderList = leaders.map(leader => ({
      id: leader.id,
      name: leader.name,
      phone: leader.phone,
      status: leader.status,
      totalOrders: leader.total_orders || 0,
      totalCommission: leader.total_commission || 0
    }))

    res.json(success(leaderList))
  } catch (err) {
    console.error('获取团长列表失败:', err)
    res.json(error('获取团长列表失败'))
  }
}

module.exports = exports
