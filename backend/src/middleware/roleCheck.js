const { error } = require('../utils/response')

/**
 * 角色权限检查中间件
 * @param {Array} allowedRoles - 允许的角色列表，如 ['admin'] 或 ['admin', 'leader']
 */
const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error('未登录', 401))
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(error('无权限访问', 403))
    }
    
    next()
  }
}

module.exports = { checkRole }
