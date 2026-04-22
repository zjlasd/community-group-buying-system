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

  // 保证 onDone 和 onError 只会触发一次，避免多次回调导致残留字符
  let finished = false
  const safeDone = () => {
    if (finished) return
    finished = true
    onDone()
  }
  const safeError = (msg: string) => {
    if (finished) return
    finished = true
    onError(msg)
  }

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
      const errData = await response.json().catch(() => null)
      safeError(errData?.message || 'AI服务暂时不可用')
      return
    }

    const reader = response.body?.getReader()
    // stream: true 模式下，TextDecoder 会保留 UTF-8 字符中间切分的字节
    // 避免中文字符被切成乱码
    const decoder = new TextDecoder('utf-8')

    if (!reader) {
      safeError('无法建立流式连接')
      return
    }

    // 行缓冲区：累积未处理完的 SSE 数据，按 "\n" 切分时保留不完整的最后一段
    let buffer = ''

    // 处理 SSE 单行数据
    const processLine = (line: string): boolean => {
      // 返回值：true = 流已结束（收到 [DONE] 或 error），需要退出外层循环
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) return false

      const data = trimmed.slice(6).trim()
      if (data === '[DONE]') {
        safeDone()
        return true
      }

      try {
        const parsed = JSON.parse(data)
        if (parsed.content) {
          onChunk(parsed.content)
        }
        if (parsed.error) {
          safeError(parsed.error)
          return true
        }
      } catch {
        // 忽略无法解析的 JSON（通常是不完整片段）
      }
      return false
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // stream: true 关键参数，避免中文被切成乱码
      buffer += decoder.decode(value, { stream: true })

      // 按 "\n" 切分，最后一段（可能不完整）保留到 buffer 里下次处理
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const shouldExit = processLine(line)
        if (shouldExit) return
      }
    }

    // 读取完毕后，刷新 decoder 并处理 buffer 里残留的最后一行
    buffer += decoder.decode()
    if (buffer.trim()) {
      processLine(buffer)
    }

    safeDone()
  } catch (err) {
    safeError('网络连接失败，请检查AI服务是否启动')
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
