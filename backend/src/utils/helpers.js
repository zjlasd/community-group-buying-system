/**
 * 辅助函数
 */

/**
 * 生成订单号
 * 格式: yyyyMMddHHmmss + 6位随机数
 */
const generateOrderNo = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hour = String(now.getHours()).padStart(2, '0')
  const minute = String(now.getMinutes()).padStart(2, '0')
  const second = String(now.getSeconds()).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 1000000)).padStart(6, '0')
  
  return `${year}${month}${day}${hour}${minute}${second}${random}`
}

/**
 * 格式化日期时间
 */
const formatDateTime = (date) => {
  if (!date) return null
  
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}

/**
 * 计算佣金金额
 */
const calculateCommission = (amount, rate) => {
  return parseFloat((amount * rate / 100).toFixed(2))
}

/**
 * 验证手机号
 */
const validatePhone = (phone) => {
  const reg = /^1[3-9]\d{9}$/
  return reg.test(phone)
}

/**
 * 脱敏手机号
 */
const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

/**
 * 脱敏账号
 */
const maskAccount = (account) => {
  if (!account) return ''
  const len = account.length
  if (len <= 8) {
    return account.substring(0, 4) + '****' + account.substring(len - 4)
  }
  return account.substring(0, 4) + ' **** **** ' + account.substring(len - 4)
}

module.exports = {
  generateOrderNo,
  formatDateTime,
  calculateCommission,
  validatePhone,
  maskPhone,
  maskAccount
}
