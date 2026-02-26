const bcrypt = require('bcrypt')
const db = require('../models')
const logger = require('../utils/logger')
const { generateOrderNo } = require('../utils/helpers')

const { User, Community, Leader, Product, Order, OrderItem, Commission } = db

/**
 * 生成测试数据
 */
const seedData = async () => {
  try {
    logger.info('开始生成测试数据...')
    
    // 1. 创建管理员用户
    logger.info('创建管理员用户...')
    const adminPassword = await bcrypt.hash('admin123', 10)
    const admin = await User.create({
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      realName: '系统管理员',
      phone: '13800138000'
    })
    logger.info(`管理员创建成功: username=admin, password=admin123`)
    
    // 2. 创建社区
    logger.info('创建社区...')
    const communities = await Community.bulkCreate([
      { name: '阳光花园', address: '解放路123号', district: '迎泽区' },
      { name: '幸福小区', address: '建设路456号', district: '杏花岭区' },
      { name: '锦绣家园', address: '文化街789号', district: '小店区' },
      { name: '绿地公园', address: '和平路234号', district: '尖草坪区' },
      { name: '春天里', address: '迎春街567号', district: '万柏林区' }
    ])
    logger.info(`创建了 ${communities.length} 个社区`)
    
    // 3. 创建团长用户
    logger.info('创建团长用户...')
    const leaderNames = ['张阿姨', '李叔叔', '王大姐', '赵师傅', '刘大妈', 
                         '陈姐', '周大哥', '吴阿姨', '郑大姐', '黄师傅']
    const leaderPassword = await bcrypt.hash('leader123', 10)
    
    for (let i = 0; i < 10; i++) {
      const user = await User.create({
        username: `leader${i + 1}`,
        password: leaderPassword,
        role: 'leader',
        realName: leaderNames[i],
        phone: `138${String(i).padStart(8, '0')}`
      })
      
      await Leader.create({
        userId: user.id,
        communityId: communities[i % 5].id,
        commissionRate: 10 + Math.floor(Math.random() * 6), // 10-15%
        balance: Math.floor(Math.random() * 5000)
      })
    }
    logger.info(`创建了 10 个团长用户 (username: leader1-leader10, password: leader123)`)
    
    // 4. 创建商品
    logger.info('创建商品...')
    const products = await Product.bulkCreate([
      {
        name: '新鲜草莓',
        category: '水果',
        price: 29.90,
        commissionRate: 12,
        stock: 150,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=300&h=300&fit=crop',
        description: '新鲜采摘的草莓，香甜可口',
        status: 1
      },
      {
        name: '有机蔬菜包',
        category: '蔬菜',
        price: 49.90,
        commissionRate: 15,
        stock: 80,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=300&h=300&fit=crop',
        description: '5种有机蔬菜组合装',
        status: 1
      },
      {
        name: '进口车厘子',
        category: '水果',
        price: 89.00,
        commissionRate: 10,
        stock: 45,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=300&h=300&fit=crop',
        description: '智利进口车厘子，颗颗饱满',
        status: 1
      },
      {
        name: '鲜牛奶',
        category: '乳制品',
        price: 48.80,
        commissionRate: 12,
        stock: 200,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&h=300&fit=crop',
        description: '本地新鲜牛奶，每日配送',
        status: 1
      },
      {
        name: '土鸡蛋',
        category: '蛋类',
        price: 32.90,
        commissionRate: 15,
        stock: 120,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=300&h=300&fit=crop',
        description: '农家散养土鸡蛋，30枚装',
        status: 1
      },
      {
        name: '新鲜蓝莓',
        category: '水果',
        price: 45.00,
        commissionRate: 12,
        stock: 60,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=300&h=300&fit=crop',
        description: '进口蓝莓，营养丰富',
        status: 1
      },
      {
        name: '五常大米',
        category: '粮油',
        price: 68.00,
        commissionRate: 10,
        stock: 90,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&h=300&fit=crop',
        description: '东北五常大米，5kg装',
        status: 1
      },
      {
        name: '新鲜猕猴桃',
        category: '水果',
        price: 36.90,
        commissionRate: 12,
        stock: 85,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=300&h=300&fit=crop',
        description: '新西兰进口猕猴桃',
        status: 1
      },
      {
        name: '有机西红柿',
        category: '蔬菜',
        price: 28.50,
        commissionRate: 15,
        stock: 30,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&h=300&fit=crop',
        description: '有机种植西红柿，2kg装',
        status: 0 // 已下架
      },
      {
        name: '精品牛肉',
        category: '肉类',
        price: 118.00,
        commissionRate: 8,
        stock: 25,
        sales: 0,
        imageUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=300&h=300&fit=crop',
        description: '优质牛肉，1kg装',
        status: 0 // 已下架
      }
    ])
    logger.info(`创建了 ${products.length} 种商品`)
    
    // 5. 生成订单（最近7天的数据）
    logger.info('生成订单数据...')
    const leaders = await Leader.findAll()
    const customerNames = ['李明', '张华', '王芳', '刘强', '陈静', '赵伟', '孙丽', '周杰', '吴敏', '郑涛',
                          '黄婷', '徐磊', '孙悦', '马超', '朱琳', '胡军', '郭敏', '林峰', '何静', '罗文']
    
    let totalOrders = 0
    
    // 生成7天的订单
    for (let day = 6; day >= 0; day--) {
      const date = new Date()
      date.setDate(date.getDate() - day)
      
      // 每天生成50条订单
      const dayOrders = 50
      
      for (let i = 0; i < dayOrders; i++) {
        const leader = leaders[Math.floor(Math.random() * leaders.length)]
        const customerName = customerNames[Math.floor(Math.random() * customerNames.length)]
        const customerPhone = `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
        
        // 随机选择1-3种商品
        const itemCount = 1 + Math.floor(Math.random() * 3)
        const selectedProducts = []
        const usedProductIds = new Set()
        
        for (let j = 0; j < itemCount; j++) {
          let product
          do {
            product = products[Math.floor(Math.random() * 8)] // 只选择前8种上架商品
          } while (usedProductIds.has(product.id))
          
          usedProductIds.add(product.id)
          selectedProducts.push(product)
        }
        
        // 计算订单总额
        let totalAmount = 0
        const orderItems = selectedProducts.map(product => {
          const quantity = 1 + Math.floor(Math.random() * 3)
          const subtotal = parseFloat((product.price * quantity).toFixed(2))
          totalAmount += subtotal
          
          return {
            productId: product.id,
            productName: product.name,
            productPrice: product.price,
            quantity,
            subtotal
          }
        })
        
        totalAmount = parseFloat(totalAmount.toFixed(2))
        
        // 计算佣金
        const commissionAmount = parseFloat((totalAmount * leader.commissionRate / 100).toFixed(2))
        
        // 确定订单状态
        let status, confirmedAt, completedAt
        if (day >= 2) {
          // 前5天的订单设为已完成
          status = 'completed'
          confirmedAt = new Date(date.getTime() + 2 * 60 * 60 * 1000) // 2小时后确认
          completedAt = new Date(date.getTime() + 48 * 60 * 60 * 1000) // 48小时后完成
        } else if (day === 1) {
          // 昨天的订单设为待自提
          status = 'pickup'
          confirmedAt = new Date(date.getTime() + 2 * 60 * 60 * 1000)
          completedAt = null
        } else {
          // 今天的订单设为待成团
          status = 'pending'
          confirmedAt = null
          completedAt = null
        }
        
        // 创建订单
        const order = await Order.create({
          orderNo: generateOrderNo(),
          leaderId: leader.id,
          communityId: leader.communityId,
          customerName,
          customerPhone,
          totalAmount,
          commissionAmount: status === 'completed' ? commissionAmount : 0,
          status,
          confirmedAt,
          completedAt,
          createdAt: date
        })
        
        // 创建订单明细
        for (const item of orderItems) {
          await OrderItem.create({
            orderId: order.id,
            ...item
          })
        }
        
        // 如果订单已完成，创建佣金记录并更新团长统计
        if (status === 'completed') {
          await Commission.create({
            leaderId: leader.id,
            orderId: order.id,
            amount: commissionAmount,
            type: 'order',
            status: 'settled',
            createdAt: completedAt
          })
          
          // 更新团长统计
          await leader.increment({
            totalOrders: 1,
            totalAmount: totalAmount,
            totalCommission: commissionAmount,
            balance: commissionAmount
          })
          
          // 更新商品销量
          for (const item of orderItems) {
            await Product.increment('sales', {
              by: item.quantity,
              where: { id: item.productId }
            })
          }
        }
        
        totalOrders++
      }
      
      logger.info(`生成了 ${date.toLocaleDateString()} 的 ${dayOrders} 条订单`)
    }
    
    logger.info(`总共生成了 ${totalOrders} 条订单`)
    logger.info('测试数据生成完成！')
    logger.info('\n=== 测试账号 ===')
    logger.info('管理员: username=admin, password=admin123')
    logger.info('团长1: username=leader1, password=leader123')
    logger.info('团长2: username=leader2, password=leader123')
    logger.info('...')
    logger.info('团长10: username=leader10, password=leader123')
    
    process.exit(0)
  } catch (err) {
    logger.error('数据生成失败:', err)
    process.exit(1)
  }
}

// 执行数据填充
seedData()
