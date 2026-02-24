const express = require('express')
const router = express.Router()
const { body } = require('express-validator')
const authController = require('../controllers/authController')
const auth = require('../middleware/auth')
const validate = require('../middleware/validator')

// 登录
router.post('/login', [
  body('username').notEmpty().withMessage('用户名不能为空'),
  body('password').notEmpty().withMessage('密码不能为空'),
  validate
], authController.login)

// 注册（仅用于测试）
router.post('/register', [
  body('username').notEmpty().withMessage('用户名不能为空')
    .isLength({ min: 3, max: 50 }).withMessage('用户名长度为3-50个字符'),
  body('password').notEmpty().withMessage('密码不能为空')
    .isLength({ min: 6 }).withMessage('密码至少6个字符'),
  body('role').optional().isIn(['admin', 'leader']).withMessage('角色只能是admin或leader'),
  validate
], authController.register)

// 获取当前用户信息
router.get('/profile', auth, authController.getProfile)

module.exports = router
