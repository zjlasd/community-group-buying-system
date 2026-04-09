# AI 智能助手技术方案（方案二：动态业务知识注入）

> **文档版本**：v1.0  
> **项目**：社区团购团长分销与订单汇总系统  
> **作者**：张建亮（2022005566）  
> **创建日期**：2026-04-08  
> **文档状态**：待实施

---

## 一、功能概述

### 1.1 功能定位

在社区团购管理系统中集成 **AI 智能助手**，为管理员和团长提供基于真实业务数据的智能问答能力。

### 1.2 核心特点

| 特性 | 说明 |
|------|------|
| **本地化部署** | 基于 Ollama + Qwen2.5-7B 模型，完全本地运行，数据不外泄 |
| **动态知识注入** | 每次对话实时查询数据库，将业务数据动态注入到模型上下文 |
| **意图识别** | 轻量级关键词意图分类，针对性检索不同业务数据 |
| **角色感知** | 根据登录用户（管理员/团长）返回不同维度的数据 |
| **流式响应** | SSE（Server-Sent Events）实现逐字输出，提升交互体验 |

### 1.3 与简单 API 转发的区别

```
❌ 方案一（套壳）：用户提问 → 固定 Prompt → Ollama → 泛泛而谈
✅ 方案二（本方案）：用户提问 → 意图识别 → 查数据库 → 动态 Prompt → Ollama → 精准回答
```

**示例对比**：

- 🔴 套壳回答："佣金一般是订单金额的10%-15%左右"
- 🟢 本方案回答："王芳团长，您本月佣金收入共 ¥1,280.50，来自 45 笔已完成订单，当前账户余额 ¥3,500.00"

---

## 二、系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3)                              │
│                                                                  │
│  ┌──────────────┐    ┌───────────────────┐                      │
│  │ Layout 组件   │    │ AIChat 组件        │                      │
│  │ (全局挂载)    │───▶│ - 悬浮按钮         │                      │
│  │              │    │ - 对话窗口         │                      │
│  │              │    │ - 消息列表         │                      │
│  │              │    │ - SSE 流式接收     │                      │
│  └──────────────┘    └────────┬──────────┘                      │
│                               │ POST /api/ai/chat               │
│                               │ (Authorization: Bearer token)    │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      后端 (Express)                              │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐     │
│  │ JWT 认证     │──▶│ 意图识别模块  │──▶│ 数据查询模块      │     │
│  │ middleware   │   │              │   │                  │     │
│  │ (auth.js)   │   │ 关键词匹配    │   │ 根据意图查询      │     │
│  │             │   │ → 6种意图     │   │ 对应数据库表      │     │
│  └─────────────┘   └──────────────┘   └────────┬─────────┘     │
│                                                 │               │
│                    ┌──────────────┐   ┌─────────▼─────────┐     │
│                    │ Ollama 调用   │◀──│ Prompt 组装模块    │     │
│                    │              │   │                   │     │
│                    │ SSE 流式转发  │   │ 静态规则 + 动态数据│     │
│                    │ → 前端       │   │ + 用户身份信息     │     │
│                    └──────────────┘   └───────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────┐    ┌──────────────────┐
│  Ollama 服务      │    │  MySQL 数据库     │
│  localhost:11434  │    │  8 张业务表       │
│  qwen2.5:7b      │    │  实时业务数据     │
└──────────────────┘    └──────────────────┘
```

### 2.2 数据流时序图

```
用户输入: "我这个月佣金多少？"
    │
    ▼
[前端] POST /api/ai/chat
    │  body: { message: "我这个月佣金多少？", history: [...] }
    │  headers: { Authorization: "Bearer <jwt>" }
    │
    ▼
[后端 - auth中间件] JWT 验证
    │  → req.user = { id: 3, username: "wangfang", role: "leader", leaderId: 5 }
    │
    ▼
[后端 - 意图识别] 关键词匹配
    │  输入: "我这个月佣金多少？"
    │  匹配关键词: "佣金"
    │  → intent = "commission"（佣金查询意图）
    │
    ▼
[后端 - 数据查询] 根据意图 + 用户身份查询数据库
    │  SELECT: leaders 表 → 团长基本信息
    │  SELECT: commissions 表 → 本月佣金汇总
    │  SELECT: orders 表 → 本月订单统计
    │  → contextData = { leader: {...}, commissions: {...}, orders: {...} }
    │
    ▼
[后端 - Prompt 组装] 拼装完整的 System Prompt
    │  = 静态业务规则
    │  + 用户身份信息（团长姓名、社区、等级）
    │  + 实时业务数据（佣金 ¥1280.50、订单 45 笔...）
    │  + 回答要求（简洁、用数据说话、引导操作）
    │
    ▼
[后端 - Ollama 调用] POST http://localhost:11434/api/chat
    │  body: { model: "qwen2.5:7b", messages: [system, ...history, user], stream: true }
    │
    ▼
[后端 → 前端] SSE 流式推送
    │  data: {"content": "您"}
    │  data: {"content": "本月"}
    │  data: {"content": "佣金"}
    │  data: {"content": "收入"}
    │  data: {"content": "共"}
    │  data: {"content": " ¥1,280.50..."}
    │  data: [DONE]
    │
    ▼
[前端] 逐字显示在对话窗口中
```

---

## 三、意图识别设计

### 3.1 意图分类表

根据系统的 8 张业务表和业务场景，定义以下 6 种意图：

| 意图 ID | 意图名称 | 触发关键词 | 查询的数据表 | 适用角色 |
|---------|---------|-----------|------------|---------|
| `commission` | 佣金查询 | 佣金、收益、收入、赚了、提成 | `commissions` + `leaders` | 管理员/团长 |
| `order` | 订单查询 | 订单、下单、成交、销售、买 | `orders` + `order_items` | 管理员/团长 |
| `withdrawal` | 提现查询 | 提现、取款、余额、到账、账户 | `withdrawals` + `leaders` | 管理员/团长 |
| `product` | 商品查询 | 商品、产品、库存、上架、卖、销量 | `products` | 管理员/团长 |
| `leader` | 团长查询 | 团长、业绩、排名、排行 | `leaders` + `communities` | 仅管理员 |
| `general` | 通用问答 | 无匹配 / 系统、帮助、怎么用 | 不查库（静态规则） | 管理员/团长 |

### 3.2 意图识别算法

采用 **加权关键词匹配** 策略：

```javascript
// 意图配置（含关键词和权重）
const INTENT_CONFIG = {
  commission: {
    keywords: ['佣金', '收益', '收入', '赚了', '提成', '结算', '分成'],
    weight: 1.0
  },
  order: {
    keywords: ['订单', '下单', '成交', '销售', '配送', '核销', '待发货', '已完成'],
    weight: 1.0
  },
  withdrawal: {
    keywords: ['提现', '取款', '余额', '到账', '账户', '打款', '提款'],
    weight: 1.0
  },
  product: {
    keywords: ['商品', '产品', '库存', '上架', '下架', '销量', '价格'],
    weight: 1.0
  },
  leader: {
    keywords: ['团长', '业绩', '排名', '排行', '活跃'],
    weight: 1.0
  }
}

// 匹配逻辑：遍历所有意图，统计命中关键词数 × 权重，取最高分
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
```

### 3.3 为什么不用 NLP/模型做意图识别

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| **关键词匹配（本方案）** | 实现简单、响应快、无额外依赖 | 无法处理复杂语义 | 毕业设计、业务领域固定 |
| NLP 模型分类 | 语义理解强 | 需要训练数据、增加延迟 | 商用系统 |
| 让 LLM 自己分类 | 最灵活 | 增加一次模型调用、成本高 | 预算充足场景 |

对于毕业设计，业务领域固定（佣金/订单/提现/商品/团长），关键词匹配已足够覆盖。

---

## 四、动态数据查询设计

### 4.1 各意图的数据查询策略

#### 4.1.1 佣金意图（commission）

**团长视角**（根据 `req.user.leaderId`）：

```sql
-- 今日佣金
SELECT COALESCE(SUM(amount), 0) AS todayCommission
FROM commissions
WHERE leader_id = ? AND status = 'settled'
  AND created_at >= CURDATE()

-- 本月佣金
SELECT COALESCE(SUM(amount), 0) AS monthCommission
FROM commissions
WHERE leader_id = ? AND status = 'settled'
  AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')

-- 团长余额和累计信息
SELECT balance, total_commission, total_orders, level, bonus_rate
FROM leaders WHERE id = ?
```

**管理员视角**：

```sql
-- 全平台佣金概览
SELECT COALESCE(SUM(amount), 0) AS totalSettled
FROM commissions WHERE status = 'settled'

-- 待结算佣金
SELECT COALESCE(SUM(amount), 0) AS totalPending
FROM commissions WHERE status = 'pending'

-- 团长佣金排行（Top 5）
SELECT l.name, SUM(c.amount) AS totalCommission
FROM commissions c JOIN leaders l ON c.leader_id = l.id
WHERE c.status = 'settled'
  AND c.created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
GROUP BY c.leader_id
ORDER BY totalCommission DESC LIMIT 5
```

#### 4.1.2 订单意图（order）

**团长视角**：

```sql
-- 今日/本月/累计订单统计
SELECT
  COUNT(*) AS totalOrders,
  SUM(total_amount) AS totalAmount,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedCount
FROM orders
WHERE leader_id = ?
  AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
```

**管理员视角**：

```sql
-- 全平台订单概览
SELECT
  COUNT(*) AS totalOrders,
  SUM(total_amount) AS totalSales,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
  SUM(CASE WHEN status = 'delivering' THEN 1 ELSE 0 END) AS deliveringCount
FROM orders
WHERE created_at >= CURDATE()
```

#### 4.1.3 提现意图（withdrawal）

**团长视角**：

```sql
-- 提现状态统计
SELECT
  (SELECT balance FROM leaders WHERE id = ?) AS balance,
  (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE leader_id = ? AND status = 'pending') AS pendingAmount,
  (SELECT COALESCE(SUM(amount), 0) FROM withdrawals WHERE leader_id = ? AND status = 'approved') AS totalWithdrawn
```

**管理员视角**：

```sql
-- 全平台提现概览
SELECT status, COUNT(*) AS count, SUM(amount) AS totalAmount
FROM withdrawals GROUP BY status
```

#### 4.1.4 商品意图（product）

```sql
-- 商品概览（管理员和团长共用）
SELECT
  COUNT(*) AS totalProducts,
  SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS onSaleCount,
  SUM(CASE WHEN stock <= 10 AND status = 1 THEN 1 ELSE 0 END) AS lowStockCount
FROM products

-- 热销商品 Top 5
SELECT p.name, p.price, p.sales, p.stock
FROM products p WHERE p.status = 1
ORDER BY p.sales DESC LIMIT 5
```

#### 4.1.5 团长意图（leader）—— 仅管理员

```sql
-- 团长概览
SELECT
  COUNT(*) AS totalLeaders,
  SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS activeCount
FROM leaders

-- 业绩排行 Top 5
SELECT l.name, c.name AS community, l.total_orders, l.total_commission, l.balance
FROM leaders l LEFT JOIN communities c ON l.community_id = c.id
WHERE l.status = 1
ORDER BY l.total_commission DESC LIMIT 5
```

### 4.2 数据查询模块的复用

> **关键原则**：优先复用项目已有的 Sequelize 模型和查询逻辑，不重复造轮子。

已有模型可直接使用：

| 模型 | 路径 | 用途 |
|------|------|------|
| `db.Leader` | `models/Leader.js` | 查询团长信息 |
| `db.Order` | `models/Order.js` | 查询订单统计 |
| `db.Commission` | `models/Commission.js` | 查询佣金数据 |
| `db.Withdrawal` | `models/Withdrawal.js` | 查询提现数据 |
| `db.Product` | `models/Product.js` | 查询商品数据 |
| `db.Community` | `models/Community.js` | 查询社区信息 |

---

## 五、Prompt 模板设计

### 5.1 System Prompt 结构

```
┌─────────────────────────────────────────┐
│             System Prompt                │
│                                          │
│  ① 角色设定（固定）                       │
│     "你是社区团购系统的AI智能助手..."      │
│                                          │
│  ② 用户身份信息（动态）                   │
│     当前用户：王芳                        │
│     角色：团长                            │
│     所属社区：阳光花园                    │
│     团长等级：3星                         │
│                                          │
│  ③ 实时业务数据（动态，按意图注入）        │
│     本月佣金：¥1,280.50                  │
│     本月订单：45 笔                       │
│     账户余额：¥3,500.00                  │
│     ...                                  │
│                                          │
│  ④ 业务规则（半固定）                     │
│     佣金计算规则...                       │
│     提现规则...                           │
│     订单流程...                           │
│                                          │
│  ⑤ 回答要求（固定）                       │
│     简洁明了、用数据说话、引导操作         │
└─────────────────────────────────────────┘
```

### 5.2 完整 Prompt 模板

```javascript
const buildSystemPrompt = (userContext, businessData, intent) => {
  return `你是「社区团购管理系统」的AI智能助手，名叫"团团"。你的职责是帮助系统用户解答业务相关问题。

## 当前用户信息
- 姓名：${userContext.name}
- 角色：${userContext.role === 'admin' ? '系统管理员' : '社区团长'}
${userContext.role === 'leader' ? `- 所属社区：${userContext.community || '未绑定'}
- 团长等级：${userContext.level || 1}星
- 等级加成：${userContext.bonusRate || 0}%` : ''}

## 实时业务数据
${businessData}

## 业务规则
1. 订单流程：预售期(1-3天) → 截单日(第4天) → 配送日(第5天) → 自提期(6-7天)
2. 订单状态：待成团(pending) → 已确认(confirmed) → 配送中(delivering) → 待自提(pickup) → 已完成(completed)
3. 佣金规则：每件商品有固定佣金金额，团长等级越高加成越多，订单完成后自动结算到团长账户
4. 提现规则：账户余额可申请提现，需管理员审核，审核通过后打款
5. 团长职责：社区推广、自提点管理、客户服务、订单核销（不负责配送）

## 回答要求
1. 回答要简洁，直接给出数据和结论
2. 涉及金额时使用 ¥ 符号，保留两位小数
3. 如果用户的问题超出系统功能范围，礼貌说明并引导到相关功能
4. 不要编造数据，只使用上面提供的实时业务数据
5. 适当给出业务建议（如提醒提现、关注低库存商品等）
6. 使用友好的语气，称呼用户的名字`
}
```

### 5.3 各意图的数据注入模板

```javascript
// 佣金意图 - 团长视角
const commissionTemplateLeader = (data) => `
【佣金数据】
- 今日佣金收入：¥${data.todayCommission}
- 本月佣金收入：¥${data.monthCommission}
- 累计佣金收入：¥${data.totalCommission}
- 当前账户余额：¥${data.balance}
- 本月已完成订单：${data.monthOrders} 笔
- 待结算佣金：¥${data.pendingCommission}
`

// 佣金意图 - 管理员视角
const commissionTemplateAdmin = (data) => `
【全平台佣金概览】
- 本月总佣金支出：¥${data.monthTotalCommission}
- 累计佣金支出：¥${data.totalCommission}
- 待结算佣金：¥${data.pendingCommission}
- 本月佣金团长排行：
${data.topLeaders.map((l, i) => `  ${i+1}. ${l.name}（${l.community}）- ¥${l.commission}`).join('\n')}
`

// 订单意图 - 团长视角
const orderTemplateLeader = (data) => `
【订单数据】
- 今日新增订单：${data.todayOrders} 笔，金额 ¥${data.todayAmount}
- 本月订单总数：${data.monthOrders} 笔，金额 ¥${data.monthAmount}
- 待确认订单：${data.pendingCount} 笔
- 配送中订单：${data.deliveringCount} 笔
- 待自提订单：${data.pickupCount} 笔
- 已完成订单：${data.completedCount} 笔
`

// 通用意图（不查库）
const generalTemplate = () => `
【系统功能说明】
本系统是社区团购管理后台，主要功能包括：
- 管理员：数据看板、订单管理、商品管理、团长管理、社区管理、佣金管理
- 团长：个人中心、我的订单、可推广商品、客户管理、提现管理
如需了解具体功能，请描述您的问题。
`
```

---

## 六、后端实现方案

### 6.1 新增文件清单

```
backend/src/
├── config/
│   └── ai.js                    # ← 新增：AI配置（Ollama地址、模型名等）
├── controllers/
│   └── aiController.js           # ← 新增：AI控制器
├── services/
│   └── aiService.js              # ← 新增：AI服务层（意图识别+数据查询+Prompt组装）
├── routes/
│   └── ai.js                     # ← 新增：AI路由
└── app.js                        # ← 修改：注册AI路由
```

### 6.2 文件详细设计

#### 6.2.1 `config/ai.js` —— AI 配置

```javascript
module.exports = {
  // Ollama 服务地址
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',

  // 使用的模型名称
  model: process.env.AI_MODEL || 'qwen2.5:7b',

  // 模型参数
  options: {
    temperature: 0.7,       // 回答的随机性（0-1），0.7 比较平衡
    top_p: 0.9,             // 核采样参数
    num_predict: 1024,      // 最大生成 token 数
  },

  // 历史消息最大保留轮数（防止 context 过长）
  maxHistoryRounds: 5
}
```

#### 6.2.2 `routes/ai.js` —— 路由定义

```javascript
const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const aiController = require('../controllers/aiController')

// AI 对话接口（需要登录）
router.post('/chat', authenticateToken, aiController.chat)

// 获取 AI 服务状态（健康检查）
router.get('/status', aiController.getStatus)

module.exports = router
```

#### 6.2.3 `controllers/aiController.js` —— 控制器

```javascript
const aiService = require('../services/aiService')
const aiConfig = require('../config/ai')
const logger = require('../utils/logger')

/**
 * AI 对话接口
 * POST /api/ai/chat
 * Body: { message: string, history: Array<{role, content}> }
 * Response: SSE 流式响应
 */
exports.chat = async (req, res) => {
  try {
    const { message, history = [] } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({
        code: 400,
        message: '消息内容不能为空'
      })
    }

    // 1. 获取用户上下文
    const userContext = await aiService.getUserContext(req.user)

    // 2. 意图识别
    const intent = aiService.classifyIntent(message)
    logger.info(`AI对话 - 用户: ${req.user.username}, 意图: ${intent}, 消息: ${message}`)

    // 3. 根据意图查询业务数据
    const businessData = await aiService.queryBusinessData(intent, req.user)

    // 4. 组装完整的消息列表
    const systemPrompt = aiService.buildSystemPrompt(userContext, businessData, intent)

    // 限制历史消息轮数
    const trimmedHistory = history.slice(-(aiConfig.maxHistoryRounds * 2))

    const messages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: message }
    ]

    // 5. 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // 6. 调用 Ollama 并流式转发
    await aiService.streamChat(messages, res)

  } catch (err) {
    logger.error('AI对话失败:', err)

    // 如果还没开始发送 SSE，返回 JSON 错误
    if (!res.headersSent) {
      return res.status(500).json({
        code: 500,
        message: 'AI服务暂时不可用，请稍后重试'
      })
    }

    // 如果已经在发送 SSE，通过 SSE 发送错误
    res.write(`data: ${JSON.stringify({ error: 'AI服务异常' })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
}

/**
 * AI 服务状态检查
 * GET /api/ai/status
 */
exports.getStatus = async (req, res) => {
  try {
    const isAvailable = await aiService.checkOllamaStatus()
    res.json({
      code: 200,
      data: {
        available: isAvailable,
        model: aiConfig.model,
        ollamaUrl: aiConfig.ollamaBaseUrl
      }
    })
  } catch (err) {
    res.json({
      code: 200,
      data: { available: false, error: err.message }
    })
  }
}
```

#### 6.2.4 `services/aiService.js` —— 核心服务（关键文件）

这是整个 AI 功能最核心的文件，包含：意图识别、数据查询、Prompt 组装、Ollama 调用。

**主要方法**：

| 方法 | 功能 | 输入 | 输出 |
|------|------|------|------|
| `classifyIntent(message)` | 意图识别 | 用户消息文本 | 意图 ID 字符串 |
| `getUserContext(user)` | 获取用户上下文 | JWT 解码的 user 对象 | 用户详细信息 |
| `queryBusinessData(intent, user)` | 查询业务数据 | 意图 + 用户 | 格式化的数据文本 |
| `buildSystemPrompt(ctx, data, intent)` | 组装 System Prompt | 上下文 + 数据 + 意图 | 完整 Prompt 字符串 |
| `streamChat(messages, res)` | 调用 Ollama 流式输出 | 消息列表 + response | 无（直接写入 res） |
| `checkOllamaStatus()` | 检查 Ollama 是否在线 | 无 | boolean |

#### 6.2.5 `app.js` —— 注册路由（修改）

在已有路由列表中新增一行：

```javascript
// 在 app.use('/api/customers', ...) 之后添加
app.use('/api/ai', require('./routes/ai'))
```

---

## 七、前端实现方案

### 7.1 新增文件清单

```
frontend/src/
├── api/
│   └── ai.ts                     # ← 新增：AI对话API（支持SSE流式）
├── components/
│   └── AIChat/
│       └── index.vue             # ← 新增：AI对话组件（悬浮按钮+对话框）
└── components/
    └── Layout/
        └── index.vue             # ← 修改：全局挂载 AIChat 组件
```

### 7.2 组件设计

#### 7.2.1 `api/ai.ts` —— API 封装

```typescript
/**
 * AI 对话 API
 * 使用原生 fetch + ReadableStream 实现 SSE 流式接收
 * 不使用 axios（因为 axios 不原生支持 SSE 流式）
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * 发送 AI 对话请求（流式）
 * @param message 用户消息
 * @param history 历史消息
 * @param onChunk 收到每个文本片段时的回调
 * @param onDone 完成时的回调
 * @param onError 错误时的回调
 */
export const sendChatMessage = async (
  message: string,
  history: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void
) => {
  const token = localStorage.getItem('token')
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

  try {
    const response = await fetch(`${baseUrl}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message, history })
    })

    if (!response.ok) {
      onError('AI服务暂时不可用')
      return
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      onError('无法建立流式连接')
      return
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const text = decoder.decode(value)
      const lines = text.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onDone()
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) {
              onChunk(parsed.content)
            }
            if (parsed.error) {
              onError(parsed.error)
              return
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    onDone()
  } catch (err) {
    onError('网络连接失败，请检查AI服务是否启动')
  }
}

/**
 * 检查 AI 服务状态
 */
export const checkAIStatus = async (): Promise<boolean> => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
    const response = await fetch(`${baseUrl}/ai/status`)
    const data = await response.json()
    return data.data?.available || false
  } catch {
    return false
  }
}
```

#### 7.2.2 `components/AIChat/index.vue` —— 对话组件

**UI 设计**：

```
┌──────────────────────────────────────────────┐
│ 💬 AI助手                              ─ ✕  │  ← 标题栏（可拖拽）
├──────────────────────────────────────────────┤
│                                              │
│  🤖 你好！我是团团，你的智能助手。          │  ← 欢迎消息
│     有什么可以帮到你的吗？                   │
│                                              │
│                      今日佣金多少？ 👤       │  ← 用户消息（右侧）
│                                              │
│  🤖 王芳团长，您今日佣金收入为 ¥85.50，    │  ← AI回复（左侧，逐字显示）
│     来自 3 笔已完成订单。                    │
│     本月累计佣金 ¥1,280.50。                │
│     建议关注待自提的 2 笔订单~               │
│                                              │
│                                        ▼     │  ← 滚动区域
├──────────────────────────────────────────────┤
│  💡 快捷提问：                               │  ← 快捷提问标签
│  [本月佣金] [待处理订单] [余额查询]          │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────┐  [发送]   │  ← 输入区域
│  │ 请输入您的问题...            │            │
│  └──────────────────────────────┘            │
└──────────────────────────────────────────────┘

                                         [💬]   ← 悬浮按钮（右下角）
```

**组件核心功能**：

| 功能 | 实现方式 |
|------|---------|
| 悬浮按钮 | 固定定位右下角，点击展开/收起对话框 |
| 对话消息列表 | 区分用户/AI消息，AI消息支持逐字显示（打字机效果） |
| 流式接收 | 使用 `api/ai.ts` 的 SSE 方法，每收到一个 chunk 追加到当前消息 |
| 快捷提问 | 预设常用问题标签，点击自动发送 |
| 历史消息 | 保留当前会话的对话历史（页面刷新后清空） |
| 自动滚动 | 新消息自动滚动到底部 |
| 加载状态 | AI回复中显示"思考中..."动画 |
| Markdown 渲染 | AI回复支持 Markdown 格式（加粗、列表等） |

**快捷提问预设（按角色区分）**：

```javascript
// 团长快捷提问
const leaderQuickQuestions = [
  '本月佣金收入',
  '待处理订单',
  '账户余额',
  '热销商品推荐',
  '如何提现'
]

// 管理员快捷提问
const adminQuickQuestions = [
  '今日销售概况',
  '待审核提现',
  '团长业绩排名',
  '库存预警',
  '本月订单趋势'
]
```

#### 7.2.3 `Layout/index.vue` —— 全局挂载（修改）

在 `<el-main>` 同级位置添加 AIChat 组件：

```vue
<!-- 主体内容 -->
<el-main class="main-content">
  <router-view />
</el-main>

<!-- AI 智能助手（全局悬浮） -->
<AIChat />
```

---

## 八、Ollama 服务要求

### 8.1 环境要求

| 项 | 要求 |
|------|------|
| Ollama 版本 | ≥ 0.1.0 |
| 模型 | qwen2.5:7b（推荐）/ qwen2.5:14b（性能更好） |
| 内存 | ≥ 8GB（7B 模型运行需约 4-6GB） |
| 磁盘 | 模型文件约 4.5GB |

### 8.2 启动命令

```bash
# 安装模型（首次需下载）
ollama pull qwen2.5:7b

# 启动 Ollama 服务（默认端口 11434）
ollama serve

# 验证服务是否正常
curl http://localhost:11434/api/tags
```

### 8.3 API 接口说明

**Ollama Chat API**：

```
POST http://localhost:11434/api/chat

请求体：
{
  "model": "qwen2.5:7b",
  "messages": [
    { "role": "system", "content": "系统提示词..." },
    { "role": "user", "content": "用户消息" }
  ],
  "stream": true,
  "options": {
    "temperature": 0.7,
    "top_p": 0.9,
    "num_predict": 1024
  }
}

流式响应（每行一个 JSON）：
{"message":{"role":"assistant","content":"你"},"done":false}
{"message":{"role":"assistant","content":"好"},"done":false}
...
{"message":{"role":"assistant","content":""},"done":true}
```

---

## 九、安全设计

### 9.1 接口安全

| 安全措施 | 实现方式 |
|---------|---------|
| **身份认证** | 复用已有 JWT 认证中间件（`middleware/auth.js`） |
| **角色权限** | 根据 `req.user.role` 控制数据查询范围（团长只查自己的数据） |
| **输入校验** | 消息内容非空校验，长度限制（防止超长输入） |
| **SQL 注入防护** | 使用 Sequelize ORM 参数化查询，原生 SQL 使用 `replacements` |
| **数据隔离** | 团长只能获取自己的业务数据，无法跨团长查询 |

### 9.2 Prompt 注入防护

```javascript
// 用户输入消息清洗（防止 Prompt 注入）
function sanitizeMessage(message) {
  // 去除可能影响系统提示词的指令
  return message
    .replace(/忽略.*指令/g, '')
    .replace(/你现在是/g, '')
    .replace(/假装你是/g, '')
    .trim()
    .slice(0, 500) // 限制最大长度 500 字符
}
```

### 9.3 请求频率限制

```javascript
// 简单的内存限流（生产环境建议使用 Redis）
const rateLimitMap = new Map()

function checkRateLimit(userId) {
  const now = Date.now()
  const userHistory = rateLimitMap.get(userId) || []
  // 清理 60 秒前的记录
  const recent = userHistory.filter(t => now - t < 60000)
  if (recent.length >= 10) { // 每分钟最多 10 次
    return false
  }
  recent.push(now)
  rateLimitMap.set(userId, recent)
  return true
}
```

---

## 十、答辩展示要点

### 10.1 演示脚本

1. **登录团长账号** → 点击右下角 AI 助手按钮
2. **演示动态数据**：输入"我这个月佣金多少" → 展示精准的佣金金额
3. **演示角色感知**：切换管理员账号 → 输入同样问题 → 展示管理员视角的全平台数据
4. **演示快捷提问**：点击"待处理订单"标签 → 展示订单状态统计
5. **演示流式输出**：观察逐字显示效果

### 10.2 技术亮点话术

> "本系统的AI智能助手具备以下三个技术亮点：
> 
> **第一，大模型本地化部署**。我们使用 Ollama 框架在本地部署了 Qwen2.5-7B 大语言模型，所有数据在本地处理，无需依赖第三方云服务 API，保障了用户数据的安全性和隐私性。
> 
> **第二，动态业务知识注入**。这不是简单的 API 套壳调用。每次用户提问时，后端会先进行意图识别，然后根据识别的意图从 MySQL 数据库中实时查询相关业务数据，将这些数据动态注入到大模型的 System Prompt 中。这样 AI 的回答能精确到具体的金额、订单数等真实数据。
> 
> **第三，基于 SSE 的流式响应**。前端通过 Server-Sent Events 协议实时接收模型的输出，实现了逐字显示的打字机效果，大幅提升了用户体验。"

### 10.3 可能的评委提问 & 回答

| 评委问题 | 建议回答 |
|---------|---------|
| "为什么不直接调用 ChatGPT API？" | 本地部署可以保障数据安全，且毕设演示不依赖网络；同时也展示了私有化部署大模型的技术能力 |
| "意图识别为什么不用 NLP 模型？" | 业务领域固定（佣金/订单/提现/商品/团长），关键词匹配已能有效覆盖；引入 NLP 模型会增加复杂度和依赖 |
| "模型的回答准确性如何保证？" | 我们不依赖模型"猜测"数据，而是将真实数据注入到 Prompt 中，模型只负责组织语言表达，数据来源是数据库查询结果 |
| "如果 Ollama 服务没启动怎么办？" | 有健康检查接口，前端会先检测 AI 服务状态；如果不可用，会显示友好提示而不影响系统其他功能 |

---

## 十一、工作量估算

| 序号 | 任务 | 预计耗时 | 输出文件 |
|------|------|---------|---------|
| 1 | AI 配置文件 | 10 分钟 | `config/ai.js` |
| 2 | AI 路由 | 15 分钟 | `routes/ai.js` |
| 3 | AI 控制器 | 30 分钟 | `controllers/aiController.js` |
| 4 | AI 服务层（核心） | 2-3 小时 | `services/aiService.js` |
| 5 | 前端 API 封装 | 30 分钟 | `api/ai.ts` |
| 6 | AIChat 对话组件 | 2-3 小时 | `components/AIChat/index.vue` |
| 7 | Layout 挂载 | 10 分钟 | `components/Layout/index.vue` |
| 8 | 注册后端路由 | 5 分钟 | `app.js` |
| 9 | 测试调优 | 1-2 小时 | - |
| **合计** | | **约 7-9 小时（1-2 天）** | **7 个文件** |

---

## 十二、后续扩展方向（答辩加分项，但不实现）

| 扩展 | 说明 | 难度 |
|------|------|------|
| RAG 检索增强 | 引入向量数据库存储操作手册/FAQ，检索后注入 | ⭐⭐⭐⭐ |
| 多轮对话上下文压缩 | 对超长历史消息做摘要压缩 | ⭐⭐⭐ |
| Function Calling | 让 AI 直接调用系统 API 执行操作（如发起提现） | ⭐⭐⭐⭐ |
| 对话记录持久化 | 将对话历史存入数据库 | ⭐⭐ |
| 多模型支持 | 支持切换不同 Ollama 模型 | ⭐ |

---

## 附录

### A. 项目已有技术栈（可复用）

| 技术 | 已有 | AI 功能复用 |
|------|------|-----------|
| Express.js | ✅ | 路由注册、中间件链 |
| JWT 认证 | ✅ | `authenticateToken` 中间件 |
| Sequelize ORM | ✅ | 全部数据查询 |
| 响应格式工具 | ✅ | `utils/response.js` 的 `success/error` |
| Winston 日志 | ✅ | `utils/logger.js` |
| Axios 请求封装 | ✅ | AI 的 SSE 使用原生 fetch（因为 axios 不原生支持） |
| Element Plus | ✅ | 对话框 UI 组件 |
| Pinia 用户状态 | ✅ | 获取当前登录用户角色信息 |

### B. 依赖变更

**后端无需新增 npm 依赖**（使用 Node.js 原生 `http` 模块调用 Ollama API）。

**前端无需新增 npm 依赖**（使用浏览器原生 `fetch` + `ReadableStream` 实现 SSE）。
