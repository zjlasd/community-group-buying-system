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
      const errData = await response.json().catch(() => null)
      onError(errData?.message || 'AI服务暂时不可用')
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
