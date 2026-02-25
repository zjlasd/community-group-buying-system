const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { User, Leader } = require('../models')
const jwtConfig = require('../config/jwt')
const { success, error } = require('../utils/response')

/**
 * 用户登录
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body
    
    // 查询用户
    const user = await User.findOne({
      where: { username },
      include: [{
        model: Leader,
        as: 'leaderInfo',
        required: false
      }]
    })
    
    if (!user) {
      return res.status(400).json(error('用户名或密码错误', 400))
    }
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json(error('用户名或密码错误', 400))
    }
    
    // 生成 JWT token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role
    }
    
    // 如果是团长，将leaderId加入token
    if (user.role === 'leader' && user.leaderInfo) {
      tokenPayload.leaderId = user.leaderInfo.id
    }
    
    const token = jwt.sign(
      tokenPayload,
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    )
    
    // 返回用户信息（不包含密码）
    const userInfo = {
      id: user.id,
      username: user.username,
      role: user.role,
      realName: user.realName,
      phone: user.phone
    }
    
    // 如果是团长，返回团长信息
    if (user.role === 'leader' && user.leaderInfo) {
      userInfo.leaderId = user.leaderInfo.id
      userInfo.commissionRate = user.leaderInfo.commissionRate
      userInfo.balance = user.leaderInfo.balance
    }
    
    res.json(success({ token, userInfo }, '登录成功'))
  } catch (err) {
    next(err)
  }
}

/**
 * 用户注册（仅用于测试，生产环境应由管理员创建）
 */
const register = async (req, res, next) => {
  try {
    const { username, password, role, realName, phone } = req.body
    
    // 检查用户名是否已存在
    const existUser = await User.findOne({ where: { username } })
    if (existUser) {
      return res.status(400).json(error('用户名已存在', 400))
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // 创建用户
    const user = await User.create({
      username,
      password: hashedPassword,
      role: role || 'leader',
      realName,
      phone
    })
    
    // 如果是团长，创建团长记录
    if (user.role === 'leader') {
      await Leader.create({
        userId: user.id
      })
    }
    
    res.json(success(null, '注册成功'))
  } catch (err) {
    next(err)
  }
}

/**
 * 获取当前用户信息
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: Leader,
        as: 'leaderInfo',
        required: false,
        include: [{
          model: require('../models').Community,
          as: 'community',
          required: false
        }]
      }]
    })
    
    if (!user) {
      return res.status(404).json(error('用户不存在', 404))
    }
    
    res.json(success(user))
  } catch (err) {
    next(err)
  }
}

module.exports = {
  login,
  register,
  getProfile
}
