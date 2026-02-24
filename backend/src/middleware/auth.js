const jwt = require('jsonwebtoken')
const jwtConfig = require('../config/jwt')
const { error } = require('../utils/response')

/**
 * JWT认证中间件
 */
const auth = async (req, res, next) => {
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
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
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

module.exports = auth
