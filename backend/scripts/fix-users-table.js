/**
 * 修复 users 表的重复索引问题
 */
const db = require('../src/models')

async function fixUsersTable() {
  try {
    console.log('开始修复 users 表...')

    // 获取所有索引
    const [indexes] = await db.sequelize.query(`
      SHOW INDEX FROM users WHERE Key_name LIKE 'username%'
    `)

    console.log(`找到 ${indexes.length} 个username相关索引`)

    // 删除除了第一个之外的所有重复索引
    const indexesToDrop = indexes
      .map(idx => idx.Key_name)
      .filter((name, index, self) => self.indexOf(name) === index) // 去重
      .filter(name => name !== 'username') // 保留username索引

    for (const indexName of indexesToDrop) {
      console.log(`删除索引: ${indexName}`)
      await db.sequelize.query(`ALTER TABLE users DROP INDEX \`${indexName}\``)
    }

    console.log('✅ users 表修复完成')
    process.exit(0)
  } catch (err) {
    console.error('❌ 修复失败:', err.message)
    process.exit(1)
  }
}

fixUsersTable()
