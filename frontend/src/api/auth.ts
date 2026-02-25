import request from '@/utils/request'

/**
 * 认证相关 API
 */

// 登录
export const login = (data: {
  username: string
  password: string
}) => {
  return request({
    url: '/auth/login',
    method: 'post',
    data
  })
}

// 注册
export const register = (data: {
  username: string
  password: string
  realName: string
  phone: string
  role?: string
}) => {
  return request({
    url: '/auth/register',
    method: 'post',
    data
  })
}

// 获取当前用户信息
export const getCurrentUser = () => {
  return request({
    url: '/auth/me',
    method: 'get'
  })
}

// 修改密码
export const changePassword = (data: {
  oldPassword: string
  newPassword: string
}) => {
  return request({
    url: '/auth/change-password',
    method: 'put',
    data
  })
}
