const jwt = require('jsonwebtoken')
const jwtConfig = require('../config/jwt')
const { error } = require('../utils/response')

/**
 * JWT认证中间件
 */
const authenticateToken = async (req, res, next) => {
  try {
    // 从请求头获取token
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json(error('未登录，请先登录', 401))
    }
    
    // 验证token
    const decoded = jwt.verify(token, jwtConfig.secret)
    
    // 将用户信息挂载到请求对象
    req.user = {
      id: decoded.id || decoded.userId,  // 兼容id和userId字段
      userId: decoded.userId || decoded.id,
      username: decoded.username,
      role: decoded.role,
      leaderId: decoded.leaderId  // 团长ID
    }
    
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(error('登录已过期，请重新登录', 401))
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json(error('无效的token', 401))
    }
    return res.status(401).json(error('认证失败', 401))
  }
}

/**
 * 角色授权中间件
 * @param {Array} roles - 允许访问的角色数组，例如 ['admin', 'leader']
 */
const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error('未认证，请先登录', 401))
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(error('权限不足，无法访问', 403))
    }
    
    next()
  }
}

// 兼容旧的导出方式
const auth = authenticateToken

module.exports = {
  auth,
  authenticateToken,
  authorizeRole
}
