const db = require('../src/models')
const bcrypt = require('bcrypt')

/**
 * 初始化订单测试数据
 */
async function seedOrders() {
  try {
    console.log('🚀 开始初始化订单数据...')

    // 1. 检查并创建团长数据
    let leaders = await db.Leader.findAll()
    if (leaders.length === 0) {
      console.log('📝 创建团长数据...')
      
      // 创建社区
      const communities = await db.Community.bulkCreate([
        { name: '阳光小区', address: '太原市小店区阳光大道123号', contactName: '张阿姨', contactPhone: '13800138001' },
        { name: '幸福小区', address: '太原市迎泽区幸福路456号', contactName: '李叔叔', contactPhone: '13800138002' },
        { name: '和谐社区', address: '太原市杏花岭区和谐街789号', contactName: '王大姐', contactPhone: '13800138003' }
      ])

      // 创建团长用户
      const hashedPassword = await bcrypt.hash('123456', 10)
      const leaderUsers = await db.User.bulkCreate([
        { username: 'leader1', password: hashedPassword, role: 'leader' },
        { username: 'leader2', password: hashedPassword, role: 'leader' },
        { username: 'leader3', password: hashedPassword, role: 'leader' }
      ])

      // 创建团长信息
      leaders = await db.Leader.bulkCreate([
        {
          userId: leaderUsers[0].id,
          communityId: communities[0].id,
          name: '张阿姨',
          phone: '13800138001',
          commissionRate: 12,
          balance: 0,
          totalOrders: 0,
          totalCommission: 0,
          status: 1
        },
        {
          userId: leaderUsers[1].id,
          communityId: communities[1].id,
          name: '李叔叔',
          phone: '13800138002',
          commissionRate: 15,
          balance: 0,
          totalOrders: 0,
          totalCommission: 0,
          status: 1
        },
        {
          userId: leaderUsers[2].id,
          communityId: communities[2].id,
          name: '王大姐',
          phone: '13800138003',
          commissionRate: 10,
          balance: 0,
          totalOrders: 0,
          totalCommission: 0,
          status: 1
        }
      ])

      console.log(`✅ 创建了 ${leaders.length} 个团长`)
    }

    // 2. 检查商品数据
    const products = await db.Product.findAll({ limit: 5 })
    if (products.length === 0) {
      console.log('⚠️  警告: 数据库中没有商品数据，请先运行商品初始化脚本')
      return
    }

    // 3. 删除旧的订单数据(如果存在)
    await db.OrderItem.destroy({ where: {}, force: true })
    await db.Order.destroy({ where: {}, force: true })
    console.log('🗑️  清理旧订单数据')

    // 4. 生成测试订单
    const statuses = ['pending', 'confirmed', 'delivering', 'pickup', 'completed']
    const orders = []

    for (let i = 0; i < 50; i++) {
      const leader = leaders[i % leaders.length]
      const orderDate = new Date()
      orderDate.setDate(orderDate.getDate() - Math.floor(i / 10)) // 最近5天的订单

      // 随机选择2-4个商品
      const orderProducts = []
      const productCount = 2 + Math.floor(Math.random() * 3)
      const usedProductIds = new Set()

      for (let j = 0; j < productCount; j++) {
        let product
        do {
          product = products[Math.floor(Math.random() * products.length)]
        } while (usedProductIds.has(product.id))
        usedProductIds.add(product.id)

        const quantity = 1 + Math.floor(Math.random() * 5)
        orderProducts.push({
          product,
          quantity
        })
      }

      // 计算订单总金额
      const totalAmount = orderProducts.reduce(
        (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
        0
      )

      // 创建订单
      const orderNo = `ORD${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}${String(i + 1).padStart(4, '0')}`
      const status = statuses[Math.min(Math.floor(i / 10), statuses.length - 1)]

      const order = await db.Order.create({
        orderNo,
        leaderId: leader.id,
        communityId: leader.communityId,
        customerName: `客户${i + 1}`,
        customerPhone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        totalAmount: totalAmount.toFixed(2),
        commissionAmount: status === 'completed' ? (totalAmount * leader.commissionRate / 100).toFixed(2) : 0,
        status,
        confirmedAt: status !== 'pending' ? orderDate : null,
        completedAt: status === 'completed' ? new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000) : null,
        createdAt: orderDate
      })

      // 创建订单明细
      for (const item of orderProducts) {
        await db.OrderItem.create({
          orderId: order.id,
          productId: item.product.id,
          productName: item.product.name,
          productPrice: item.product.price,
          quantity: item.quantity,
          subtotal: (parseFloat(item.product.price) * item.quantity).toFixed(2)
        })
      }

      orders.push(order)
    }

    console.log(`✅ 成功创建 ${orders.length} 个订单`)

    // 5. 统计信息
    const statusStats = {}
    for (const status of statuses) {
      const count = orders.filter(o => o.status === status).length
      statusStats[status] = count
    }

    console.log('\n📊 订单统计:')
    console.log('待成团(pending):', statusStats.pending || 0)
    console.log('待配送(confirmed):', statusStats.confirmed || 0)
    console.log('配送中(delivering):', statusStats.delivering || 0)
    console.log('待自提(pickup):', statusStats.pickup || 0)
    console.log('已完成(completed):', statusStats.completed || 0)

    console.log('\n✅ 订单数据初始化完成!')
    process.exit(0)
  } catch (err) {
    console.error('❌ 初始化失败:', err)
    process.exit(1)
  }
}

// 执行初始化
seedOrders()
