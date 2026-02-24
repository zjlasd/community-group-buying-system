const { validationResult } = require('express-validator')
const { error } = require('../utils/response')

/**
 * 参数验证中间件
 */
const validate = (req, res, next) => {
  const errors = validationResult(req)
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }))
    
    return res.status(400).json(error('参数验证失败', 400, errorMessages))
  }
  
  next()
}

module.exports = validate
