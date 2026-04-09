/**
 * AI 智能助手配置
 */
module.exports = {
  // Ollama 服务地址
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',

  // 使用的模型名称
  model: process.env.AI_MODEL || 'qwen:4b',

  // 模型参数
  options: {
    temperature: 0.7,       // 回答的随机性（0-1），0.7 比较平衡
    top_p: 0.9,             // 核采样参数
    num_predict: 4096,      // 最大生成 token 数
  },

  // 历史消息最大保留轮数（防止 context 过长）
  maxHistoryRounds: 5
}
