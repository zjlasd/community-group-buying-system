/**
 * AI 智能助手服务层
 * 核心职责：意图识别、结构化数据查询、Prompt 组装、Ollama 流式调用
 * 
 * 设计原则：
 * 1. 数据查询输出结构化 JSON，让 AI 做"分析加工"而非"复述数据"
 * 2. Prompt 中明确要求模型引用具体数字、做环比/趋势分析、给出建议
 * 3. 查询失败直接返回错误提示，不让模型瞎编
 */
const http = require('http')
const { Op } = require('sequelize')
const db = require('../models')
const aiConfig = require('../config/ai')
const logger = require('../utils/logger')

// ==================== 意图识别 ====================

/**
 * 意图配置（含关键词和权重）
 */
const INTENT_CONFIG = {
  commission: {
    keywords: ['佣金', '收益', '收入', '赚了', '提成', '结算', '分成'],
    weight: 1.0,
    label: '佣金分析'
  },
  order: {
    keywords: ['订单', '下单', '成交', '销售', '配送', '核销', '待发货', '已完成'],
    weight: 1.0,
    label: '订单分析'
  },
  trend: {
    keywords: ['趋势', '走势', '变化', '对比', '增长', '下降', '环比', '同比', '分析', '近几天', '最近'],
    weight: 1.2,
    label: '趋势分析'
  },
  withdrawal: {
    keywords: ['提现', '取款', '余额', '到账', '账户', '打款', '提款'],
    weight: 1.0,
    label: '提现与余额'
  },
  product: {
    keywords: ['商品', '产品', '库存', '上架', '下架', '销量', '价格'],
    weight: 1.0,
    label: '商品分析'
  },
  leader: {
    keywords: ['团长', '业绩', '排名', '排行', '活跃'],
    weight: 1.0,
    label: '团长业绩'
  }
}

/**
 * 意图识别 - 加权关键词匹配
 * @param {string} message - 用户输入消息
 * @returns {string} 意图 ID
 */
function classifyIntent(message) {
  let bestIntent = 'general'
  let bestScore = 0

  for (const [intent, config] of Object.entries(INTENT_CONFIG)) {
    let score = 0
    for (const keyword of config.keywords) {
      if (message.includes(keyword)) {
        score += config.weight
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestIntent = intent
    }
  }

  return bestIntent
}

// ==================== 用户上下文 ====================

/**
 * 获取用户上下文信息
 * @param {object} user - JWT 解码的用户对象 { id, username, role, leaderId }
 * @returns {object} 用户上下文
 */
async function getUserContext(user) {
  const context = {
    name: user.username,
    role: user.role
  }

  // 如果是团长，查询团长详细信息
  if (user.role === 'leader' && user.leaderId) {
    try {
      const leader = await db.Leader.findByPk(user.leaderId, {
        include: [{ model: db.Community, as: 'community' }]
      })
      if (leader) {
        context.name = leader.name || user.username
        context.community = leader.community?.name || '未绑定'
        context.commissionRate = parseFloat(leader.commissionRate) || 0
        context.balance = parseFloat(leader.balance) || 0
      }
    } catch (err) {
      logger.error('获取团长上下文失败:', err)
    }
  }

  return context
}

// ==================== 业务数据查询（结构化 JSON 输出） ====================

/**
 * 根据意图查询业务数据
 * 返回 { success: boolean, data: object|null, error: string|null }
 * 
 * @param {string} intent - 意图 ID
 * @param {object} user - 用户对象
 * @returns {object} 查询结果
 */
async function queryBusinessData(intent, user) {
  try {
    switch (intent) {
      case 'commission':
        return user.role === 'leader'
          ? await queryCommissionForLeader(user.leaderId)
          : await queryCommissionForAdmin()
      case 'order':
        return user.role === 'leader'
          ? await queryOrderForLeader(user.leaderId)
          : await queryOrderForAdmin()
      case 'trend':
        return user.role === 'leader'
          ? await queryTrendForLeader(user.leaderId)
          : await queryTrendForAdmin()
      case 'withdrawal':
        return user.role === 'leader'
          ? await queryWithdrawalForLeader(user.leaderId)
          : await queryWithdrawalForAdmin()
      case 'product':
        return await queryProductData()
      case 'leader':
        return user.role === 'admin'
          ? await queryLeaderData()
          : { success: false, data: null, error: '团长无权查看其他团长信息' }
      case 'general':
      default:
        return { success: true, data: null, error: null } // general 意图不注入数据
    }
  } catch (err) {
    logger.error(`查询业务数据失败 [意图: ${intent}]:`, err)
    return { success: false, data: null, error: '数据查询异常，暂时无法获取业务数据' }
  }
}

// ---------- 佣金查询（结构化 JSON） ----------

async function queryCommissionForLeader(leaderId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todaySum, monthSum, leader, pendingSum, monthOrders] = await Promise.all([
    db.Commission.sum('amount', {
      where: { leader_id: leaderId, status: 'settled', created_at: { [Op.gte]: today } }
    }),
    db.Commission.sum('amount', {
      where: { leader_id: leaderId, status: 'settled', created_at: { [Op.gte]: monthStart } }
    }),
    db.Leader.findByPk(leaderId),
    db.Commission.sum('amount', {
      where: { leader_id: leaderId, status: 'pending' }
    }),
    db.Order.count({
      where: { leader_id: leaderId, status: 'completed', created_at: { [Op.gte]: monthStart } }
    })
  ])

  return {
    success: true,
    data: {
      dataType: '佣金数据',
      todayCommission: parseFloat((todaySum || 0).toFixed(2)),
      monthCommission: parseFloat((monthSum || 0).toFixed(2)),
      totalCommission: parseFloat(leader?.totalCommission || 0),
      balance: parseFloat(leader?.balance || 0),
      pendingCommission: parseFloat((pendingSum || 0).toFixed(2)),
      monthCompletedOrders: monthOrders
    },
    error: null
  }
}

async function queryCommissionForAdmin() {
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [totalSettled, totalPending, topLeaders] = await Promise.all([
    db.Commission.sum('amount', { where: { status: 'settled' } }),
    db.Commission.sum('amount', { where: { status: 'pending' } }),
    db.Commission.findAll({
      attributes: [
        'leader_id',
        [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'totalCommission']
      ],
      where: { status: 'settled', created_at: { [Op.gte]: monthStart } },
      include: [{
        model: db.Leader, as: 'leader', attributes: ['name'],
        include: [{ model: db.Community, as: 'community', attributes: ['name'] }]
      }],
      group: ['leader_id'],
      order: [[db.sequelize.fn('SUM', db.sequelize.col('amount')), 'DESC']],
      limit: 5
    })
  ])

  const ranking = topLeaders.map((item, i) => ({
    rank: i + 1,
    name: item.leader?.name || '未知',
    community: item.leader?.community?.name || '未绑定',
    commission: parseFloat(parseFloat(item.getDataValue('totalCommission')).toFixed(2))
  }))

  return {
    success: true,
    data: {
      dataType: '全平台佣金概览',
      totalSettled: parseFloat((totalSettled || 0).toFixed(2)),
      totalPending: parseFloat((totalPending || 0).toFixed(2)),
      monthTopLeaders: ranking
    },
    error: null
  }
}

// ---------- 订单查询（结构化 JSON） ----------

async function queryOrderForLeader(leaderId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todayOrders, monthStats] = await Promise.all([
    db.Order.findAll({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 0), 'amount']
      ],
      where: { leader_id: leaderId, created_at: { [Op.gte]: today } },
      raw: true
    }),
    db.Order.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 0), 'amount']
      ],
      where: { leader_id: leaderId, created_at: { [Op.gte]: monthStart } },
      group: ['status'],
      raw: true
    })
  ])

  const statusBreakdown = {}
  let monthTotal = 0
  let monthAmount = 0
  for (const row of monthStats) {
    statusBreakdown[row.status] = { count: parseInt(row.count), amount: parseFloat(row.amount) }
    monthTotal += parseInt(row.count)
    monthAmount += parseFloat(row.amount)
  }

  return {
    success: true,
    data: {
      dataType: '订单数据',
      todayOrders: parseInt(todayOrders[0]?.count || 0),
      todayAmount: parseFloat(parseFloat(todayOrders[0]?.amount || 0).toFixed(2)),
      monthTotalOrders: monthTotal,
      monthTotalAmount: parseFloat(monthAmount.toFixed(2)),
      statusBreakdown
    },
    error: null
  }
}

async function queryOrderForAdmin() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [todayStats, monthStats] = await Promise.all([
    db.Order.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 0), 'amount']
      ],
      where: { created_at: { [Op.gte]: today } },
      group: ['status'],
      raw: true
    }),
    db.Order.findAll({
      attributes: [
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
        [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('total_amount')), 0), 'amount']
      ],
      where: { created_at: { [Op.gte]: monthStart } },
      raw: true
    })
  ])

  const todayStatusBreakdown = {}
  let todayTotal = 0
  let todayAmount = 0
  for (const row of todayStats) {
    todayStatusBreakdown[row.status] = parseInt(row.count)
    todayTotal += parseInt(row.count)
    todayAmount += parseFloat(row.amount)
  }

  return {
    success: true,
    data: {
      dataType: '全平台订单概览',
      todayOrders: todayTotal,
      todayAmount: parseFloat(todayAmount.toFixed(2)),
      monthTotalOrders: parseInt(monthStats[0]?.count || 0),
      monthTotalAmount: parseFloat(parseFloat(monthStats[0]?.amount || 0).toFixed(2)),
      todayStatusBreakdown
    },
    error: null
  }
}

// ---------- 提现查询（结构化 JSON） ----------

async function queryWithdrawalForLeader(leaderId) {
  const [leader, pendingAmount, totalWithdrawn] = await Promise.all([
    db.Leader.findByPk(leaderId, { attributes: ['balance'] }),
    db.Withdrawal.sum('amount', { where: { leader_id: leaderId, status: 'pending' } }),
    db.Withdrawal.sum('amount', { where: { leader_id: leaderId, status: 'approved' } })
  ])

  const balance = parseFloat(leader?.balance || 0)
  const pending = parseFloat((pendingAmount || 0).toFixed(2))

  return {
    success: true,
    data: {
      dataType: '提现与余额',
      balance: parseFloat(balance.toFixed(2)),
      available: parseFloat((balance - pending >= 0 ? balance - pending : 0).toFixed(2)),
      pendingWithdrawal: pending,
      totalWithdrawn: parseFloat((totalWithdrawn || 0).toFixed(2))
    },
    error: null
  }
}

async function queryWithdrawalForAdmin() {
  const stats = await db.Withdrawal.findAll({
    attributes: [
      'status',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      [db.sequelize.fn('COALESCE', db.sequelize.fn('SUM', db.sequelize.col('amount')), 0), 'totalAmount']
    ],
    group: ['status'],
    raw: true
  })

  const statusBreakdown = {}
  for (const row of stats) {
    statusBreakdown[row.status] = {
      count: parseInt(row.count),
      amount: parseFloat(parseFloat(row.totalAmount).toFixed(2))
    }
  }

  return {
    success: true,
    data: {
      dataType: '全平台提现概览',
      statusBreakdown
    },
    error: null
  }
}

// ---------- 商品查询（结构化 JSON） ----------

async function queryProductData() {
  const [totalProducts, onSaleCount, lowStockCount, topSales] = await Promise.all([
    db.Product.count(),
    db.Product.count({ where: { status: 1 } }),
    db.Product.count({ where: { status: 1, stock: { [Op.lte]: 10 } } }),
    db.Product.findAll({
      where: { status: 1 },
      order: [['sales', 'DESC']],
      limit: 5,
      attributes: ['name', 'price', 'sales', 'stock'],
      raw: true
    })
  ])

  const topList = topSales.map((p, i) => ({
    rank: i + 1,
    name: p.name,
    price: parseFloat(p.price),
    sales: p.sales,
    stock: p.stock
  }))

  return {
    success: true,
    data: {
      dataType: '商品数据',
      totalProducts,
      onSaleCount,
      lowStockCount,
      topSalesRanking: topList
    },
    error: null
  }
}

// ---------- 团长查询（结构化 JSON，仅管理员） ----------

async function queryLeaderData() {
  const [totalLeaders, activeCount, topLeaders] = await Promise.all([
    db.Leader.count(),
    db.Leader.count({ where: { status: 1 } }),
    db.Leader.findAll({
      where: { status: 1 },
      include: [{ model: db.Community, as: 'community', attributes: ['name'] }],
      order: [['totalCommission', 'DESC']],
      limit: 5,
      attributes: ['name', 'totalOrders', 'totalCommission', 'balance'],
      raw: true,
      nest: true
    })
  ])

  const ranking = topLeaders.map((l, i) => ({
    rank: i + 1,
    name: l.name,
    community: l.community?.name || '未绑定',
    totalOrders: l.totalOrders,
    totalCommission: parseFloat(l.totalCommission),
    balance: parseFloat(l.balance)
  }))

  return {
    success: true,
    data: {
      dataType: '团长概览',
      totalLeaders,
      activeLeaders: activeCount,
      performanceRanking: ranking
    },
    error: null
  }
}

// ---------- 趋势分析查询（结构化 JSON） ----------

async function queryTrendForAdmin() {
  const days = 7
  const trendData = []

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date()
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const [orderCount, orderAmount, commissionAmount] = await Promise.all([
      db.Order.count({ where: { created_at: { [Op.between]: [dayStart, dayEnd] } } }),
      db.Order.sum('total_amount', { where: { created_at: { [Op.between]: [dayStart, dayEnd] } } }),
      db.Commission.sum('amount', {
        where: { status: 'settled', created_at: { [Op.between]: [dayStart, dayEnd] } }
      })
    ])

    trendData.push({
      date: `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`,
      orderCount,
      salesAmount: parseFloat((orderAmount || 0).toFixed(2)),
      commissionAmount: parseFloat((commissionAmount || 0).toFixed(2))
    })
  }

  return {
    success: true,
    data: {
      dataType: '近7天趋势数据（全平台）',
      period: `${trendData[0]?.date} 至 ${trendData[trendData.length - 1]?.date}`,
      dailyData: trendData
    },
    error: null
  }
}

async function queryTrendForLeader(leaderId) {
  const days = 7
  const trendData = []

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date()
    dayStart.setDate(dayStart.getDate() - i)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const [orderCount, orderAmount] = await Promise.all([
      db.Order.count({
        where: { leader_id: leaderId, created_at: { [Op.between]: [dayStart, dayEnd] } }
      }),
      db.Order.sum('total_amount', {
        where: { leader_id: leaderId, created_at: { [Op.between]: [dayStart, dayEnd] } }
      })
    ])

    trendData.push({
      date: `${dayStart.getFullYear()}-${String(dayStart.getMonth() + 1).padStart(2, '0')}-${String(dayStart.getDate()).padStart(2, '0')}`,
      orderCount,
      salesAmount: parseFloat((orderAmount || 0).toFixed(2))
    })
  }

  return {
    success: true,
    data: {
      dataType: '你近7天的订单趋势',
      period: `${trendData[0]?.date} 至 ${trendData[trendData.length - 1]?.date}`,
      dailyData: trendData
    },
    error: null
  }
}

// ==================== Prompt 组装（升级版） ====================

/**
 * 构建 System Prompt
 * 
 * 设计原则：
 * - 业务意图：明确要求模型做数据分析（引用数字、环比、建议）
 * - 通用意图：极简 prompt，保留模型通识能力
 */
function buildSystemPrompt(userContext, intent) {
  const roleName = userContext.role === 'admin' ? '管理员' : '团长'
  
  // 通用意图：极简 prompt
  if (!intent || intent === 'general') {
    return `你是"团团"，社区团购管理系统的智能助手。用户叫${userContext.name}，是${roleName}。请用自然友好的语气回答问题，简洁明了。`
  }

  // 业务意图：带数据分析要求的 prompt
  return `你是"团团"，社区团购管理系统的数据分析助手。用户叫${userContext.name}，是${roleName}。

你的回答要求：
1. 必须引用数据中的具体数字，不要泛泛而谈
2. 如果是趋势数据，要指出变化方向（上升/下降/平稳），并计算变化幅度
3. 如果发现异常波动（如某天数据明显偏高或偏低），要指出并分析可能原因
4. 在最后给出1-2条可操作的建议
5. 用自然友好的语气，像专业顾问一样对话
6. 如果数据全为0，告诉用户暂无相关数据，并建议查看其他维度`
}

/**
 * 组装用户消息 —— 结构化数据注入
 * 
 * - general 意图 / 无数据：直接透传用户消息
 * - 数据查询失败：直接返回错误提示文本（不走模型）
 * - 业务意图 + 有数据：将 JSON 数据注入用户消息，明确要求 AI 分析
 * 
 * @param {string} userMessage - 用户原始消息
 * @param {object} queryResult - queryBusinessData 的返回值 { success, data, error }
 * @param {string} intent - 意图 ID
 * @returns {{ message: string, skipAI: boolean }} 组装结果
 */
function buildUserMessage(userMessage, queryResult, intent) {
  // general 意图：直接透传
  if (intent === 'general' || !queryResult || !queryResult.data) {
    return { message: userMessage, skipAI: false }
  }

  // 数据查询失败：直接返回错误，跳过 AI 调用
  if (!queryResult.success) {
    return {
      message: `⚠️ ${queryResult.error || '数据查询失败，请稍后重试'}`,
      skipAI: true
    }
  }

  // 业务意图 + 有数据：结构化注入
  const intentLabel = INTENT_CONFIG[intent]?.label || '业务数据'
  const jsonData = JSON.stringify(queryResult.data, null, 2)

  const enhanced = `请基于以下真实业务数据回答我的问题。

【${intentLabel} - JSON 数据】
${jsonData}

分析要求：
1. 必须引用上述数据中的具体数字
2. 指出关键指标的变化或特征
3. 如有异常数据，分析可能原因
4. 给出1-2条可操作的建议

用户问题：${userMessage}`

  return { message: enhanced, skipAI: false }
}

// ==================== Ollama 调用 ====================

/**
 * 用户输入消息清洗（防止 Prompt 注入）
 */
function sanitizeMessage(message) {
  return message
    .replace(/忽略.*指令/g, '')
    .replace(/你现在是/g, '')
    .replace(/假装你是/g, '')
    .trim()
    .slice(0, 500)
}

/**
 * 简单的内存限流
 */
const rateLimitMap = new Map()

function checkRateLimit(userId) {
  const now = Date.now()
  const userHistory = rateLimitMap.get(userId) || []
  const recent = userHistory.filter(t => now - t < 60000)
  if (recent.length >= 10) {
    return false
  }
  recent.push(now)
  rateLimitMap.set(userId, recent)
  return true
}

/**
 * 调用 Ollama 并流式转发到客户端
 * @param {Array} messages - 消息列表
 * @param {object} res - Express response 对象
 */
function streamChat(messages, res) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: aiConfig.model,
      messages,
      stream: true,
      options: aiConfig.options
    })

    const url = new URL(`${aiConfig.ollamaBaseUrl}/api/chat`)

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (ollamaRes) => {
        if (ollamaRes.statusCode !== 200) {
          reject(new Error(`Ollama 返回状态码: ${ollamaRes.statusCode}`))
          return
        }

        let buffer = ''

        ollamaRes.on('data', (chunk) => {
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          // 保留最后一个不完整的行
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const parsed = JSON.parse(line)
              if (parsed.message?.content) {
                res.write(`data: ${JSON.stringify({ content: parsed.message.content })}\n\n`)
              }
              if (parsed.done) {
                res.write('data: [DONE]\n\n')
                res.end()
                resolve()
              }
            } catch (parseErr) {
              // 忽略 JSON 解析错误（可能是不完整的数据）
              logger.debug('Ollama 响应解析跳过:', line)
            }
          }
        })

        ollamaRes.on('end', () => {
          // 处理残留 buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer)
              if (parsed.message?.content) {
                res.write(`data: ${JSON.stringify({ content: parsed.message.content })}\n\n`)
              }
            } catch (e) {
              // 忽略
            }
          }
          if (!res.writableEnded) {
            res.write('data: [DONE]\n\n')
            res.end()
          }
          resolve()
        })

        ollamaRes.on('error', (err) => {
          reject(err)
        })
      }
    )

    req.on('error', (err) => {
      reject(new Error(`无法连接 Ollama 服务 (${aiConfig.ollamaBaseUrl}): ${err.message}`))
    })

    // 设置超时 60 秒
    req.setTimeout(60000, () => {
      req.destroy()
      reject(new Error('Ollama 请求超时'))
    })

    req.write(postData)
    req.end()
  })
}

/**
 * 检查 Ollama 服务是否在线
 * @returns {Promise<boolean>}
 */
function checkOllamaStatus() {
  return new Promise((resolve) => {
    const url = new URL(`${aiConfig.ollamaBaseUrl}/api/tags`)

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET'
      },
      (res) => {
        resolve(res.statusCode === 200)
      }
    )

    req.on('error', () => resolve(false))
    req.setTimeout(5000, () => {
      req.destroy()
      resolve(false)
    })

    req.end()
  })
}

module.exports = {
  classifyIntent,
  getUserContext,
  queryBusinessData,
  buildSystemPrompt,
  buildUserMessage,
  sanitizeMessage,
  checkRateLimit,
  streamChat,
  checkOllamaStatus
}
