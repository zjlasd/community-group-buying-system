/**
 * AI 智能助手控制器
 */
const aiService = require('../services/aiService')
const aiConfig = require('../config/ai')
const logger = require('../utils/logger')
const { error } = require('../utils/response')

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
      return res.status(400).json(error('消息内容不能为空', 400))
    }

    // 频率限制检查
    if (!aiService.checkRateLimit(req.user.id)) {
      return res.status(429).json(error('请求过于频繁，请稍后再试', 429))
    }

    // 1. 消息清洗
    const sanitizedMessage = aiService.sanitizeMessage(message)

    // 2. 获取用户上下文
    const userContext = await aiService.getUserContext(req.user)

    // 3. 意图识别
    const intent = aiService.classifyIntent(sanitizedMessage)
    logger.info(`AI对话 - 用户: ${req.user.username}, 意图: ${intent}, 消息: ${sanitizedMessage}`)

    // 4. 根据意图查询业务数据
    const businessData = await aiService.queryBusinessData(intent, req.user)

    // 5. 组装 Prompt（传入 intent 让 system prompt 适配业务/通用场景）
    const systemPrompt = aiService.buildSystemPrompt(userContext, intent)
    const { message: enhancedMessage, skipAI } = aiService.buildUserMessage(sanitizedMessage, businessData, intent)

    // 6. 设置 SSE 响应头（无论走不走模型，都用 SSE 格式返回）
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    // 7. 如果数据查询失败，直接返回错误提示，跳过 AI 模型调用
    if (skipAI) {
      res.write(`data: ${JSON.stringify({ content: enhancedMessage })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    // 8. 组装消息列表，调用 Ollama 流式转发
    const trimmedHistory = history.slice(-(aiConfig.maxHistoryRounds * 2))

    const messages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: enhancedMessage }
    ]

    await aiService.streamChat(messages, res)

  } catch (err) {
    logger.error('AI对话失败:', err)

    // 如果还没开始发送 SSE，返回 JSON 错误
    if (!res.headersSent) {
      return res.status(500).json(error('AI服务暂时不可用，请稍后重试', 500))
    }

    // 如果已经在发送 SSE，通过 SSE 发送错误
    res.write(`data: ${JSON.stringify({ error: 'AI服务异常，请检查 Ollama 是否已启动' })}\n\n`)
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
