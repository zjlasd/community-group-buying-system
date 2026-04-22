/**
 * AI 智能助手配置
 */
module.exports = {
  // Ollama 服务地址
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',

  // 使用的模型名称（升级为 qwen2.5:7b，中文理解与数据推理能力更强）
  model: process.env.AI_MODEL || 'qwen2.5:7b',

  // 模型参数
  options: {
    temperature: 0.5,       // 降低随机性，减少胡言乱语（0.5 比 0.7 更稳）
    top_p: 0.9,             // 核采样参数
    num_predict: 2048,      // 最大生成 token 数（避免过长和循环输出）
  },

  // 历史消息最大保留轮数（防止 context 过长）
  maxHistoryRounds: 5
}
