<template>
  <div class="message-wrapper">
    <div :class="['message', isUser ? 'user-message' : 'ai-message', { 'step-message': isStep }]">
      <div class="message-avatar">
        <el-avatar :size="40" :src="avatarSrc" />
      </div>
      <div class="message-content" :class="{ 'error-message': error, 'step-content': isStep }">
        <div class="message-text" v-if="!loading" v-html="formattedContent"></div>
        <div class="message-loading" v-else-if="loading">
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
        <div class="message-time">{{ formattedTime }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true
})

const props = defineProps({
  content: {
    type: String,
    required: true
  },
  isUser: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    default: '/user-avatar.png'
  },
  aiAvatar: {
    type: String,
    default: '/ai-avatar.png'
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: Boolean,
    default: false
  },
  isStep: {
    type: Boolean,
    default: false
  },
  // 是否启用打字机效果
  useTypewriter: {
    type: Boolean,
    default: false
  }
})

// 打字机效果的当前显示文本
const displayText = ref('')
// 当前打字进度索引
const typeIndex = ref(0)
// 打字速度（毫秒/字符）
const typingSpeed = 10
// 是否正在打字
const isTyping = ref(false)
// 上次内容（用于检测变化）
const lastContent = ref('')

// 格式化消息内容
const formattedContent = computed(() => {
  // 如果是步骤消息，使用特殊格式
  if (props.isStep) {
    const content = props.content || '';
    // 为步骤消息添加图标
    if (content.startsWith('Step ')) {
      return `<span class="step-icon">🔄</span> ${marked(content)}`;
    } else if (content.includes('completed successfully')) {
      return `<span class="step-icon">✅</span> ${marked(content)}`;
    } else {
      return `<span class="step-icon">ℹ️</span> ${marked(content)}`;
    }
  }
  
  // 如果是错误消息，添加错误图标
  if (props.error) {
    return `<span class="error-icon">❌</span> ${marked(props.content || '')}`;
  }
  
  // 如果是用户消息或不使用打字机效果，直接显示全部内容
  if (props.isUser || !props.useTypewriter) {
    return marked(props.content || '')
  }
  
  // 否则使用打字机显示的部分内容
  return marked(displayText.value || '')
})

// 用户头像
const avatarSrc = computed(() => {
  return props.isUser ? props.userAvatar : props.aiAvatar
})

// 格式化时间
const formattedTime = computed(() => {
  const date = new Date(props.timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
})

// 启动打字机效果 - 只处理新增的内容
const processNewContent = () => {
  // 如果是用户消息或步骤消息，不需要打字机效果
  if (props.isUser || props.isStep || !props.useTypewriter) {
    displayText.value = props.content
    return
  }
  
  // 如果是全新的消息，重置打字状态
  if (!lastContent.value || props.content.indexOf(lastContent.value) !== 0) {
    typeIndex.value = 0
    displayText.value = ''
    lastContent.value = ''
  }
  
  // 计算需要添加的新内容
  const newContent = props.content.substring(lastContent.value.length)
  if (!newContent) return;
  
  // 更新内容记录
  lastContent.value = props.content
  
  // 流式处理新增的内容
  let charIndex = 0
  isTyping.value = true
  
  const typeNextChar = () => {
    if (charIndex < newContent.length) {
      displayText.value += newContent.charAt(charIndex)
      charIndex++
      setTimeout(typeNextChar, typingSpeed)
    } else {
      isTyping.value = false
    }
  }
  
  typeNextChar()
}

// 监听内容变化
watch(() => props.content, (newContent) => {
  // 内容变化时，处理新增的部分
  if (newContent !== lastContent.value) {
    processNewContent()
  }
}, { immediate: true })

// 组件挂载时
onMounted(() => {
  // 初始处理
  processNewContent()
})
</script>

<style scoped>
.message-wrapper {
  margin-bottom: 20px;
  width: 100%;
}

.message {
  display: flex;
  max-width: 85%;
  position: relative;
}

.user-message {
  margin-left: auto;
  flex-direction: row-reverse;
}

.ai-message {
  margin-right: auto;
}

.step-message {
  max-width: 95%;
}

.message-avatar {
  margin: 0 10px;
  flex-shrink: 0;
}

.message-content {
  background-color: white;
  padding: 12px 16px;
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  position: relative;
  text-align: left;
}

.user-message .message-content {
  background-color: #ecf5ff;
  color: #303133;
}

.error-message {
  border-left: 4px solid #F56C6C;
  background-color: #fef0f0 !important;
  color: #F56C6C;
}

.step-content {
  background-color: #f2f6fc;
  border-left: 4px solid #409EFF;
  font-size: 0.9em;
}

.step-icon {
  margin-right: 6px;
  display: inline-block;
}

.error-icon {
  margin-right: 6px;
  display: inline-block;
}

.message-text {
  word-break: break-word;
  line-height: 1.6;
  text-align: left;
}

.message-loading {
  min-height: 24px;
  display: flex;
  align-items: center;
}

.typing-dots {
  display: flex;
}

.typing-dot {
  width: 8px;
  height: 8px;
  margin: 0 3px;
  background-color: #909399;
  border-radius: 50%;
  opacity: 0.6;
  animation: typing 1.4s infinite both;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  text-align: right;
}

/* Message content markdown styles */
.message-text :deep(pre) {
  background-color: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-text :deep(code) {
  font-family: monospace;
  padding: 2px 4px;
  background-color: #f6f8fa;
  border-radius: 3px;
  font-size: 0.9em;
}

.message-text :deep(pre code) {
  padding: 0;
  background: transparent;
}

.message-text :deep(p) {
  margin: 8px 0;
}

.message-text :deep(ul), .message-text :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.message-text :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  padding-left: 16px;
  color: #6a737d;
  margin: 8px 0;
}

.message-text :deep(table) {
  border-collapse: collapse;
  margin: 8px 0;
  overflow-x: auto;
  display: block;
}

.message-text :deep(table th), .message-text :deep(table td) {
  border: 1px solid #dfe2e5;
  padding: 8px 12px;
}

.message-text :deep(table th) {
  background-color: #f6f8fa;
}

/* 消息气泡箭头 */
.message-content::before {
  content: '';
  position: absolute;
  top: 14px;
  width: 0;
  height: 0;
  border-style: solid;
}

.ai-message .message-content::before {
  left: -8px;
  border-width: 8px 8px 8px 0;
  border-color: transparent white transparent transparent;
}

.user-message .message-content::before {
  right: -8px;
  border-width: 8px 0 8px 8px;
  border-color: transparent transparent transparent #ecf5ff;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .message {
    max-width: 95%;
  }
  
  .message-content {
    padding: 10px 12px;
  }
  
  .message-text {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .message-wrapper {
    margin-bottom: 16px;
  }
  
  .message-avatar .el-avatar {
    width: 32px;
    height: 32px;
  }
}
</style> 