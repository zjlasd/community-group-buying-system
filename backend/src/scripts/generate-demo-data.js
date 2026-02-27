const bcrypt = require('bcrypt')
const db = require('../models')
const logger = require('../utils/logger')
const { generateOrderNo } = require('../utils/helpers')
const { Op } = require('sequelize')

const { User, Community, Leader, Product, Order, OrderItem, Commission, Withdrawal } = db

/**
 * 清理演示数据
 */
const cleanDemoData = async () => {
  logger.info('🧹 清理旧的演示数据...')
  
  // 1. 清理佣金记录
  const commissionCount = await Commission.destroy({ where: {} })
  logger.info(`✅ 清理了 ${commissionCount} 条佣金记录`)
  
  // 2. 清理订单明细
  const orderItemCount = await OrderItem.destroy({ where: {} })
  logger.info(`✅ 清理了 ${orderItemCount} 条订单明细`)
  
  // 3. 清理订单
  const orderCount = await Order.destroy({ where: {} })
  logger.info(`✅ 清理了 ${orderCount} 条订单`)
  
  // 4. 清理提现申请
  const withdrawalCount = await Withdrawal.destroy({ where: {} })
  logger.info(`✅ 清理了 ${withdrawalCount} 条提现申请`)
  
  // 5. 重置团长统计数据
  await Leader.update(
    {
      totalOrders: 0,
      totalAmount: 0,
      totalCommission: 0,
      balance: 0
    },
    { where: {} }
  )
  logger.info('✅ 重置团长统计数据')
}

/**
 * 生成演示数据 - 最近一个月的订单数据
 * 重点为 admin 和 leader1 生成演示数据
 */
const generateDemoData = async () => {
  try {
    logger.info('🚀 开始生成演示数据（最近一个月）...')
    
    // 0. 先清理旧数据
    await cleanDemoData()
    
    // 1. 检查并创建管理员用户
    logger.info('📝 检查管理员用户...')
    let admin = await User.findOne({ where: { username: 'admin' } })
    if (!admin) {
      const adminPassword = await bcrypt.hash('123456', 10)
      admin = await User.create({
        username: 'admin',
        password: adminPassword,
        role: 'admin',
        realName: '系统管理员',
        phone: '13800138000'
      })
      logger.info('✅ 管理员账号已创建: username=admin, password=123456')
    } else {
      logger.info('✅ 管理员账号已存在')
    }
    
    // 2. 检查并创建社区
    logger.info('📝 检查社区数据...')
    let communities = await Community.findAll()
    if (communities.length === 0) {
      communities = await Community.bulkCreate([
        { name: '阳光花园', address: '解放路123号', district: '迎泽区' },
        { name: '幸福小区', address: '建设路456号', district: '杏花岭区' },
        { name: '锦绣家园', address: '文化街789号', district: '小店区' },
        { name: '绿地公园', address: '和平路234号', district: '尖草坪区' },
        { name: '春天里', address: '迎春街567号', district: '万柏林区' }
      ])
      logger.info(`✅ 创建了 ${communities.length} 个社区`)
    } else {
      logger.info(`✅ 已存在 ${communities.length} 个社区`)
    }
    
    // 3. 检查并创建团长用户（重点创建leader1）
    logger.info('📝 检查团长用户...')
    const leaderNames = ['张阿姨', '李叔叔', '王大姐', '赵师傅', '刘大妈', 
                         '陈姐', '周大哥', '吴阿姨', '郑大姐', '黄师傅']
    const leaderPassword = await bcrypt.hash('123456', 10)
    
    let leader1User = await User.findOne({ where: { username: 'leader1' } })
    let leader1 = null
    
    if (!leader1User) {
      // 创建leader1用户
      leader1User = await User.create({
        username: 'leader1',
        password: leaderPassword,
        role: 'leader',
        realName: leaderNames[0],
        phone: '13800000001'
      })
      
      leader1 = await Leader.create({
        userId: leader1User.id,
        communityId: communities[0].id,
        name: leaderNames[0],  // 设置团长姓名
        phone: '13800000001',
        commissionRate: 12, // 12%佣金比例
        balance: 0,
        totalOrders: 0,
        totalAmount: 0,
        totalCommission: 0
      })
      logger.info('✅ 创建团长账号: username=leader1, password=123456')
    } else {
      leader1 = await Leader.findOne({ where: { userId: leader1User.id } })
      if (!leader1) {
        leader1 = await Leader.create({
          userId: leader1User.id,
          communityId: communities[0].id,
          name: leaderNames[0],  // 设置团长姓名
          phone: '13800000001',
          commissionRate: 12,
          balance: 0,
          totalOrders: 0,
          totalAmount: 0,
          totalCommission: 0
        })
      }
      // 重置团长统计数据并更新name/phone
      await leader1.update({
        name: leaderNames[0],  // 确保name字段有值
        phone: '13800000001',
        balance: 0,
        totalOrders: 0,
        totalAmount: 0,
        totalCommission: 0
      })
      logger.info('✅ 团长账号已存在，统计数据已重置')
    }
    
    // 创建其他团长（用于数据看板展示）
    const existingLeaders = await Leader.findAll()
    if (existingLeaders.length < 10) {
      for (let i = existingLeaders.length; i < 10; i++) {
        const username = `leader${i + 1}`
        let user = await User.findOne({ where: { username } })
        
        if (!user) {
          user = await User.create({
            username,
            password: leaderPassword,
            role: 'leader',
            realName: leaderNames[i % leaderNames.length],
            phone: `138${String(i).padStart(8, '0')}`
          })
          
          await Leader.create({
            userId: user.id,
            communityId: communities[i % 5].id,
            name: leaderNames[i % leaderNames.length],  // 设置团长姓名
            phone: `138${String(i).padStart(8, '0')}`,
            commissionRate: 10 + Math.floor(Math.random() * 6),
            balance: 0,
            totalOrders: 0,
            totalAmount: 0,
            totalCommission: 0
          })
        } else {
          // 如果用户已存在,确保Leader记录也有name字段
          const existingLeader = await Leader.findOne({ where: { userId: user.id } })
          if (existingLeader && !existingLeader.name) {
            await existingLeader.update({
              name: leaderNames[i % leaderNames.length],
              phone: `138${String(i).padStart(8, '0')}`
            })
          }
        }
      }
      logger.info('✅ 其他团长账号已创建')
    } else {
      // 如果已经有10个团长,确保所有团长都有name字段
      for (const leader of existingLeaders) {
        if (!leader.name) {
          const user = await User.findOne({ where: { id: leader.userId } })
          if (user) {
            await leader.update({
              name: user.realName,
              phone: user.phone
            })
          }
        }
      }
      logger.info('✅ 已更新团长姓名信息')
    }
    
    // 4. 检查并创建商品
    logger.info('📝 检查商品数据...')
    let products = await Product.findAll()
    if (products.length === 0) {
      products = await Product.bulkCreate([
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
          stock: 100,
          sales: 0,
          imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=300&h=300&fit=crop',
          description: '有机种植西红柿，2kg装',
          status: 1
        },
        {
          name: '精品牛肉',
          category: '肉类',
          price: 118.00,
          commissionRate: 8,
          stock: 50,
          sales: 0,
          imageUrl: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=300&h=300&fit=crop',
          description: '优质牛肉，1kg装',
          status: 1
        }
      ])
      logger.info(`✅ 创建了 ${products.length} 种商品`)
    } else {
      // 重置商品销量
      await Product.update({ sales: 0 }, { where: {} })
      logger.info(`✅ 已存在 ${products.length} 种商品，销量已重置`)
    }
    
    // 5. 清空旧订单数据
    logger.info('📝 清空旧订单数据...')
    await OrderItem.destroy({ where: {} })
    await Commission.destroy({ where: {} })
    await Withdrawal.destroy({ where: {} })
    await Order.destroy({ where: {} })
    logger.info('✅ 旧订单数据已清空')
    
    // 6. 生成最近60天的订单数据
    logger.info('📝 生成最近60天的订单数据...')
    const allLeaders = await Leader.findAll()
    const customerNames = ['李明', '张华', '王芳', '刘强', '陈静', '赵伟', '孙丽', '周杰', '吴敏', '郑涛',
                          '黄婷', '徐磊', '孙悦', '马超', '朱琳', '胡军', '郭敏', '林峰', '何静', '罗文',
                          '冯娜', '蒋勇', '韩雪', '曹杰', '薛敏', '阎丽', '杜涛', '姚静', '戴军', '方芳']
    
    let totalOrders = 0
    let leader1OrderCount = 0
    
    // 生成60天的订单（增加历史数据）
    for (let day = 59; day >= 0; day--) {
      // 重要：每次循环创建新的日期对象
      const date = new Date()
      date.setDate(date.getDate() - day)
      date.setHours(9, 0, 0, 0) // 设置为早上9点
      
      // leader1 每天的订单数：确保每天都有订单
      let leader1DayOrders
      if (day === 0) {
        // 今天：5-8条订单
        leader1DayOrders = 5 + Math.floor(Math.random() * 4)
      } else if (day <= 7) {
        // 最近7天：5-10条
        leader1DayOrders = 5 + Math.floor(Math.random() * 6)
      } else if (day <= 30) {
        // 8-30天：3-8条
        leader1DayOrders = 3 + Math.floor(Math.random() * 6)
      } else {
        // 31-60天：2-5条（历史数据，确保每天至少2单）
        leader1DayOrders = 2 + Math.floor(Math.random() * 4)
      }
      
      // 其他团长的订单数：减少，让重点在leader1
      const otherOrders = Math.floor(leader1DayOrders * 0.8) // 其他团长订单约为leader1的80%
      
      // 每天总订单数 = leader1订单 + 其他团长订单
      const dayOrders = leader1DayOrders + otherOrders
      
      let leader1DayOrderCount = 0
      
      for (let i = 0; i < dayOrders; i++) {
        // 前 leader1DayOrders 条订单分配给 leader1
        const leader = i < leader1DayOrders ? leader1 : allLeaders[Math.floor(Math.random() * allLeaders.length)]
        const customerName = customerNames[Math.floor(Math.random() * customerNames.length)]
        const customerPhone = `139${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`
        
        // 随机选择1-3种商品
        const itemCount = 1 + Math.floor(Math.random() * 3)
        const selectedProducts = []
        const usedProductIds = new Set()
        
        for (let j = 0; j < itemCount; j++) {
          let product
          do {
            product = products[Math.floor(Math.random() * products.length)]
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
        // 每个订单的时间随机分散在当天的 9:00-20:00
        const randomMinutes = Math.floor(Math.random() * 660) // 11小时 = 660分钟
        const orderTime = new Date(date.getTime() + randomMinutes * 60 * 1000)
        
        if (day >= 7) {
          // 7天前的订单：已完成
          status = 'completed'
          confirmedAt = new Date(orderTime.getTime() + 2 * 60 * 60 * 1000)
          completedAt = new Date(orderTime.getTime() + 48 * 60 * 60 * 1000)
        } else if (day >= 3) {
          // 3-6天前的订单：待自提（供演示核销功能）
          status = 'pickup'
          confirmedAt = new Date(orderTime.getTime() + 2 * 60 * 60 * 1000)
          completedAt = null
        } else if (day >= 1) {
          // 1-2天前的订单：待配送（供演示配送清单导出）
          status = 'delivering'
          confirmedAt = new Date(orderTime.getTime() + 2 * 60 * 60 * 1000)
          completedAt = null
        } else {
          // 今天的订单：40%已完成（有佣金），60%待成团
          const random = Math.random()
          if (random < 0.4) {
            // 40%的订单已完成（供演示今日佣金）
            status = 'completed'
            confirmedAt = new Date(orderTime.getTime() + 2 * 60 * 60 * 1000)
            completedAt = new Date(orderTime.getTime() + 4 * 60 * 60 * 1000) // 4小时后完成
          } else {
            // 60%的订单待成团
            status = 'pending'
            confirmedAt = null
            completedAt = null
          }
        }
        
        // 创建订单
        try {
          const orderNo = generateOrderNo()
          const order = await Order.create({
            orderNo,
            leaderId: leader.id,
            communityId: leader.communityId,
            customerName,
            customerPhone,
            totalAmount,
            commissionAmount: status === 'completed' ? commissionAmount : 0,
            status,
            confirmedAt,
            completedAt
          })
          
          // 使用原生 SQL 更新 created_at（因为 Sequelize timestamps 会自动管理）
          await db.sequelize.query(
            'UPDATE orders SET created_at = ? WHERE id = ?',
            {
              replacements: [orderTime, order.id],
              type: db.sequelize.QueryTypes.UPDATE
            }
          )
          
          // 创建订单明细
          for (const item of orderItems) {
            await OrderItem.create({
              orderId: order.id,
              ...item
            })
          }
          
          // 如果订单已完成，创建佣金记录并更新团长统计
          if (status === 'completed') {
            const commission = await Commission.create({
              leaderId: leader.id,
              orderId: order.id,
              amount: commissionAmount,
              type: 'order',
              status: 'settled'
            })
            
            // 使用原生 SQL 更新佣金记录的 created_at 时间为订单完成时间
            await db.sequelize.query(
              'UPDATE commissions SET created_at = ? WHERE id = ?',
              {
                replacements: [completedAt, commission.id],
                type: db.sequelize.QueryTypes.UPDATE
              }
            )
            
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
          if (leader.id === leader1.id) {
            leader1OrderCount++
            leader1DayOrderCount++
          }
        } catch (error) {
          logger.error(`❌ 创建订单失败 [第${i+1}/${dayOrders}条]: ${error.message}`)
          logger.error(`   日期: ${date.toLocaleDateString('zh-CN')}`)
          logger.error(`   团长: ${leader.id}`)
          logger.error(`   状态: ${status}`)
          // 继续执行，不终止脚本
          continue
        }
      }
      
      logger.info(`📅 ${date.toLocaleDateString('zh-CN')}: 生成 ${dayOrders} 条订单（leader: ${leader1DayOrderCount} 条）`)
    }
    
    // 7. 为 leader1 和其他团长生成提现申请（用于演示提现功能）
    logger.info('📝 生成提现申请记录...')
    
    // 刷新 leader1 数据
    await leader1.reload()
    
    // 重新查询所有团长（此时余额已更新）
    const leadersWithBalance = await Leader.findAll({
      where: {
        balance: { [Op.gt]: 0 }
      },
      order: [['balance', 'DESC']]
    })
    
    const withdrawals = []
    
    if (leader1.balance > 0) {
      // leader1 的提现记录（6条）
      // 1. 待审核（3天前申请）
      withdrawals.push({
        leaderId: leader1.id,
        amount: parseFloat((leader1.balance * 0.1).toFixed(2)),
        method: 'alipay',
        accountInfo: '138****0001',
        accountName: leaderNames[0],
        status: 'pending',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      })
      
      // 2. 待审核（1天前申请）
      withdrawals.push({
        leaderId: leader1.id,
        amount: parseFloat((leader1.balance * 0.15).toFixed(2)),
        method: 'wechat',
        accountInfo: 'wx_****0001',
        accountName: leaderNames[0],
        status: 'pending',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      })
      
      // 3. 已通过（12天前申请，10天前审核）
      withdrawals.push({
        leaderId: leader1.id,
        amount: 800.00,
        method: 'alipay',
        accountInfo: '138****0001',
        accountName: leaderNames[0],
        status: 'approved',
        approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        approvedBy: admin.id,
        remarks: '审核通过，已打款',
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000)
      })
      
      // 4. 已通过（18天前申请，16天前审核）
      withdrawals.push({
        leaderId: leader1.id,
        amount: 650.00,
        method: 'wechat',
        accountInfo: 'wx_****0001',
        accountName: leaderNames[0],
        status: 'approved',
        approvedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
        approvedBy: admin.id,
        remarks: '已通过',
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000)
      })
      
      // 5. 已拒绝（8天前申请，7天前拒绝）
      withdrawals.push({
        leaderId: leader1.id,
        amount: 1500.00,
        method: 'bank',
        accountInfo: '6222****0001',
        accountName: leaderNames[0],
        status: 'rejected',
        approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        approvedBy: admin.id,
        remarks: '提现金额超过可用余额',
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000)
      })
      
      // 6. 已通过（25天前申请，23天前审核）
      withdrawals.push({
        leaderId: leader1.id,
        amount: 500.00,
        method: 'alipay',
        accountInfo: '138****0001',
        accountName: leaderNames[0],
        status: 'approved',
        approvedAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000),
        approvedBy: admin.id,
        remarks: '审核通过',
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
      })
    }
    
    // 其他团长的提现记录（8-10条）
    const topLeaders = leadersWithBalance
      .filter(l => l.id !== leader1.id && l.balance > 100) // 降低门槛到100元
      .slice(0, 8) // 选择前8个有余额的团长
    
    for (const leader of topLeaders) {
      const leaderUser = await User.findOne({ where: { id: leader.userId } })
      const leaderName = leaderUser?.realName || leader.name || '团长'
      
      // 每个团长生成1-2条提现记录
      const recordCount = Math.random() > 0.5 ? 2 : 1
      
      for (let i = 0; i < recordCount; i++) {
        const status = Math.random() > 0.7 ? 'pending' : 'approved' // 70%通过，30%待审核
        const daysAgo = Math.floor(Math.random() * 20 + 5) // 5-25天前
        
        const withdrawal = {
          leaderId: leader.id,
          amount: parseFloat((Math.random() * 300 + 100).toFixed(2)),
          method: Math.random() > 0.5 ? 'alipay' : 'wechat',
          accountInfo: Math.random() > 0.5 ? '138****' + String(leader.id).padStart(4, '0') : 'wx_****' + leader.id,
          accountName: leaderName,
          status,
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
        }
        
        if (status === 'approved') {
          withdrawal.approvedAt = new Date(Date.now() - (daysAgo - 1) * 24 * 60 * 60 * 1000)
          withdrawal.approvedBy = admin.id
          withdrawal.remarks = '审核通过'
        }
        
        withdrawals.push(withdrawal)
      }
    }
    
    // 批量创建提现记录
    for (const withdrawal of withdrawals) {
      const created = await Withdrawal.create(withdrawal)
      // 使用原生 SQL 更新 created_at
      await db.sequelize.query(
        'UPDATE withdrawals SET created_at = ? WHERE id = ?',
        {
          replacements: [withdrawal.createdAt, created.id],
          type: db.sequelize.QueryTypes.UPDATE
        }
      )
    }
    
    logger.info(`✅ 生成了 ${withdrawals.length} 条提现申请记录`)
    
    logger.info('\n' + '='.repeat(60))
    logger.info('🎉 演示数据生成完成！')
    logger.info('='.repeat(60))
    logger.info('\n📊 数据统计：')
    logger.info(`   - 总订单数: ${totalOrders} 条`)
    logger.info(`   - leader1 订单数: ${leader1OrderCount} 条`)
    logger.info(`   - 商品种类: ${products.length} 种`)
    logger.info(`   - 团长数量: ${allLeaders.length} 人`)
    logger.info(`   - 社区数量: ${communities.length} 个`)
    
    logger.info('\n👤 测试账号：')
    logger.info('   管理员: username=admin, password=123456')
    logger.info('   团长1:  username=leader1, password=leader123')
    
    logger.info('\n📋 订单状态分布：')
    logger.info('   - 待成团: 今天的订单')
    logger.info('   - 待配送: 1-2天前的订单（可导出配送清单）')
    logger.info('   - 待自提: 3-6天前的订单（可进行核销）')
    logger.info('   - 已完成: 7天前的订单（已结算佣金）')
    
    logger.info('\n🎯 演示建议：')
    logger.info('   1. 管理员端：')
    logger.info('      - 数据看板：查看最近30天的运营数据')
    logger.info('      - 订单管理：筛选"待配送"订单，导出配送清单')
    logger.info('      - 佣金管理：查看提现申请，进行审核')
    logger.info('   2. 团长端（leader）：')
    logger.info('      - 个人中心：查看佣金收益和订单趋势')
    logger.info('      - 我的订单：筛选"待自提"订单，进行核销')
    logger.info('      - 提现管理：查看提现记录，申请新的提现')
    
    logger.info('\n💡 快速演示脚本：')
    logger.info('   演示前运行: cd backend && pnpm run demo')
    logger.info('   演示后清理: cd backend && pnpm run clean-demo')
    logger.info('='.repeat(60))
    
    process.exit(0)
  } catch (err) {
    logger.error('❌ 演示数据生成失败:', err)
    process.exit(1)
  }
}

// 执行数据生成
generateDemoData()
