<template>
  <!-- 悬浮按钮 -->
  <div
    class="ai-float-btn"
    :class="{ 'is-active': isOpen }"
    @click="toggleChat"
  >
    <el-icon :size="24"><ChatDotRound /></el-icon>
  </div>

  <!-- 对话框 -->
  <Transition name="ai-chat">
    <div v-show="isOpen" class="ai-chat-panel">
      <!-- 标题栏 -->
      <div class="ai-chat-header">
        <div class="ai-chat-title">
          <span class="ai-icon">🤖</span>
          <span>AI 助手 - 团团</span>
          <el-tag v-if="!aiAvailable" type="danger" size="small" style="margin-left: 8px">离线</el-tag>
        </div>
        <div class="ai-chat-header-actions">
          <el-icon class="action-icon" @click="clearMessages" title="清空对话"><Delete /></el-icon>
          <el-icon class="action-icon" @click="toggleChat" title="关闭"><Close /></el-icon>
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="messageListRef" class="ai-chat-messages">
        <!-- 欢迎消息 -->
        <div class="message-item assistant" v-if="messages.length === 0">
          <div class="message-avatar">🤖</div>
          <div class="message-content">
            <p>你好{{ userName ? '，' + userName : '' }}！我是<strong>团团</strong>，你的智能助手。</p>
            <p>我可以帮你分析佣金、订单、销售趋势等业务数据，也能回答各类知识问题，有什么可以帮到你的吗？</p>
          </div>
        </div>

        <!-- 消息列表 -->
        <div
          v-for="(msg, index) in messages"
          :key="index"
          class="message-item"
          :class="msg.role"
        >
          <div class="message-avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
          <div class="message-content" v-html="renderMarkdown(msg.content)"></div>
        </div>

        <!-- 加载状态 -->
        <div v-if="isLoading" class="message-item assistant">
          <div class="message-avatar">🤖</div>
          <div class="message-content thinking">
            <span class="dot-flashing"></span>
            <span style="margin-left: 20px; color: #999; font-size: 13px">思考中...</span>
          </div>
        </div>
      </div>

      <!-- 快捷提问 -->
      <div class="ai-chat-quick" v-if="!isLoading">
        <span class="quick-label">💡 快捷提问：</span>
        <div class="quick-tags">
          <el-tag
            v-for="q in quickQuestions"
            :key="q"
            class="quick-tag"
            type="info"
            effect="plain"
            size="small"
            @click="sendQuickQuestion(q)"
          >
            {{ q }}
          </el-tag>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="ai-chat-input">
        <el-input
          v-model="inputMessage"
          :placeholder="aiAvailable ? '请输入您的问题...' : 'AI 服务不可用，请检查 Ollama'"
          :disabled="isLoading || !aiAvailable"
          @keyup.enter="sendMessage"
          size="default"
        />
        <el-button
          type="primary"
          :disabled="!inputMessage.trim() || isLoading || !aiAvailable"
          @click="sendMessage"
          size="default"
        >
          发送
        </el-button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { ChatDotRound, Delete, Close } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { sendChatMessage, checkAIStatus } from '@/api/ai'
import type { ChatMessage } from '@/api/ai'

const userStore = useUserStore()

// 状态
const isOpen = ref(false)
const isLoading = ref(false)
const aiAvailable = ref(false)
const inputMessage = ref('')
const messages = ref<ChatMessage[]>([])
const messageListRef = ref<HTMLElement | null>(null)

// 当前正在流式接收的消息索引
const streamingIndex = ref(-1)

// 用户名
const userName = computed(() => {
  return userStore.userInfo?.nickname || userStore.userInfo?.username || ''
})

// 快捷提问（按角色区分）
const quickQuestions = computed(() => {
  if (userStore.isLeader()) {
    return ['本月佣金收入', '待处理订单', '账户余额', '近7天订单趋势', '如何提现']
  }
  return ['今日销售概况', '待审核提现', '团长业绩排名', '库存预警', '近7天订单趋势']
})

// 展开/收起
const toggleChat = () => {
  isOpen.value = !isOpen.value
}

// 清空对话
const clearMessages = () => {
  messages.value = []
  streamingIndex.value = -1
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 简单的 Markdown 渲染（加粗、列表、换行）
const renderMarkdown = (text: string): string => {
  if (!text) return ''
  return text
    // 加粗
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // 行内代码
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // 无序列表
    .replace(/^[-*]\s+(.+)/gm, '<li>$1</li>')
    // 有序列表
    .replace(/^\d+\.\s+(.+)/gm, '<li>$1</li>')
    // 换行
    .replace(/\n/g, '<br>')
    // 包裹连续的 li 标签
    .replace(/((?:<li>.*?<\/li><br>?)+)/g, '<ul>$1</ul>')
    // 清理 ul 内多余的 br
    .replace(/<ul>(.*?)<\/ul>/gs, (match) => match.replace(/<br>/g, ''))
}

// 发送消息
const sendMessage = async () => {
  const msg = inputMessage.value.trim()
  if (!msg || isLoading.value || !aiAvailable.value) return

  // 添加用户消息
  messages.value.push({ role: 'user', content: msg })
  inputMessage.value = ''
  isLoading.value = true
  scrollToBottom()

  // 准备历史消息（排除当前消息）
  const history = messages.value.slice(0, -1).map(m => ({
    role: m.role,
    content: m.content
  }))

  // 添加一个空的 AI 消息占位
  messages.value.push({ role: 'assistant', content: '' })
  streamingIndex.value = messages.value.length - 1

  await sendChatMessage(
    msg,
    history,
    // onChunk: 收到文本片段
    (text: string) => {
      isLoading.value = false
      if (streamingIndex.value >= 0) {
        messages.value[streamingIndex.value].content += text
        scrollToBottom()
      }
    },
    // onDone: 完成
    () => {
      isLoading.value = false
      streamingIndex.value = -1
      scrollToBottom()
    },
    // onError: 错误
    (error: string) => {
      isLoading.value = false
      if (streamingIndex.value >= 0) {
        messages.value[streamingIndex.value].content = `⚠️ ${error}`
      }
      streamingIndex.value = -1
      scrollToBottom()
    }
  )
}

// 快捷提问
const sendQuickQuestion = (question: string) => {
  inputMessage.value = question
  sendMessage()
}

// 检查 AI 服务状态
const checkStatus = async () => {
  aiAvailable.value = await checkAIStatus()
}

// 监听打开状态，打开时检查 AI 服务
watch(isOpen, (val) => {
  if (val) {
    checkStatus()
  }
})

// 初始化
onMounted(() => {
  checkStatus()
})
</script>

<style scoped>
/* 悬浮按钮 */
.ai-float-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 2000;
}

.ai-float-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.ai-float-btn.is-active {
  background: linear-gradient(135deg, #f5576c 0%, #ff6b6b 100%);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
}

/* 对话面板 */
.ai-chat-panel {
  position: fixed;
  right: 24px;
  bottom: 90px;
  width: 400px;
  height: 560px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 2000;
}

/* 标题栏 */
.ai-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.ai-chat-title {
  display: flex;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
}

.ai-icon {
  margin-right: 8px;
  font-size: 20px;
}

.ai-chat-header-actions {
  display: flex;
  gap: 12px;
}

.action-icon {
  cursor: pointer;
  font-size: 18px;
  opacity: 0.85;
  transition: opacity 0.2s;
}

.action-icon:hover {
  opacity: 1;
}

/* 消息列表 */
.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fe;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
  gap: 10px;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  background: #e8eaf6;
}

.message-item.user .message-avatar {
  background: #e3f2fd;
}

.message-content {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-item.assistant .message-content {
  background: #fff;
  color: #333;
  border: 1px solid #e8e8e8;
  border-radius: 2px 12px 12px 12px;
}

.message-item.user .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border-radius: 12px 2px 12px 12px;
}

/* 思考中动画 */
.thinking {
  display: flex;
  align-items: center;
}

.dot-flashing {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #667eea;
  animation: dot-flashing 1s infinite linear alternate;
}

.dot-flashing::before,
.dot-flashing::after {
  content: '';
  display: inline-block;
  position: absolute;
  top: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #667eea;
}

.dot-flashing::before {
  left: -12px;
  animation: dot-flashing 1s infinite alternate;
  animation-delay: 0s;
}

.dot-flashing::after {
  left: 12px;
  animation: dot-flashing 1s infinite alternate;
  animation-delay: 0.5s;
}

@keyframes dot-flashing {
  0% { background-color: #667eea; }
  50%, 100% { background-color: #c5cae9; }
}

/* 快捷提问 */
.ai-chat-quick {
  padding: 8px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.quick-label {
  font-size: 12px;
  color: #999;
}

.quick-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.quick-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.quick-tag:hover {
  color: #667eea;
  border-color: #667eea;
}

/* 输入区域 */
.ai-chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
}

.ai-chat-input .el-input {
  flex: 1;
}

/* Markdown 渲染样式 */
.message-content :deep(strong) {
  font-weight: 600;
}

.message-content :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 13px;
}

.message-content :deep(ul) {
  margin: 6px 0;
  padding-left: 18px;
}

.message-content :deep(li) {
  margin: 2px 0;
}

/* 过渡动画 */
.ai-chat-enter-active,
.ai-chat-leave-active {
  transition: all 0.3s ease;
}

.ai-chat-enter-from,
.ai-chat-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

/* 滚动条美化 */
.ai-chat-messages::-webkit-scrollbar {
  width: 4px;
}

.ai-chat-messages::-webkit-scrollbar-thumb {
  background: #c5cae9;
  border-radius: 2px;
}

.ai-chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
</style>
