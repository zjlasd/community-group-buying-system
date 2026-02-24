require('dotenv').config()

module.exports = {
  secret: process.env.JWT_SECRET || 'default-secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
}
