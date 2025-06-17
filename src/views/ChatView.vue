<template>
  <div class="chat-container">
    <div class="chat-sidebar" :class="{ 'mobile-hidden': isMobile && !showSidebar }">
      <div class="sidebar-header">
        <h3>Lei AI</h3>
        <div class="sidebar-actions">
          <el-button type="success" size="small" @click="createNewChat">
            <el-icon><Plus /></el-icon>
            新聊天
          </el-button>
          <el-button v-if="isMobile" type="text" @click="toggleSidebar" class="close-sidebar">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>
      </div>
      
      <div class="agent-section">
        <div class="section-header">
          <span class="section-title"><el-icon><User /></el-icon> 智能体</span>
        </div>
        
        <div class="agent-list">
          <div 
            v-for="agent in chatStore.agentTypes" 
            :key="agent.id"
            class="agent-item"
            :class="{ 'active': agent.id === selectedAgentId }"
            @click="changeAgent(agent.id)"
          >
            <el-avatar :size="28" :src="agent.avatar" class="agent-avatar"></el-avatar>
            <div class="agent-info">
              <div class="agent-name">{{ agent.name }}</div>
              <div class="agent-description-short">{{ agent.description.substring(0, 30) + '...' }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="conversation-section">
        <div class="section-header">
          <span class="section-title"><el-icon><ChatDotSquare /></el-icon> 对话列表</span>
        </div>
        
        <div class="chat-history">
          <div
            v-for="chat in chatStore.sortedChatHistory"
            :key="chat.id"
            class="chat-history-item"
            :class="{ active: chat.id === chatStore.currentChatId }"
            @click="selectChat(chat.id)"
          >
            <div class="chat-title">{{ chat.title || '新对话' }}</div>
            <div class="chat-actions">
              <el-button
                type="text"
                size="small"
                @click.stop="deleteChat(chat.id)"
                class="delete-btn"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
          
          <div v-if="chatStore.sortedChatHistory.length === 0" class="empty-history">
            <p>暂无对话</p>
          </div>
        </div>
      </div>
    </div>
    
    <div class="chat-main">
      <div class="chat-header">
        <div class="header-left">
          <el-button v-if="isMobile" @click="toggleSidebar" text class="menu-btn">
            <el-icon><Menu /></el-icon>
          </el-button>
          <div class="current-agent-info">
            <el-avatar :size="32" :src="currentAgentAvatar" class="current-agent-avatar"></el-avatar>
            <h2>{{ currentAgentName }}</h2>
          </div>
        </div>
        <div class="chat-actions">
          <el-button type="primary" plain size="small" @click="clearChat">
            <el-icon><Delete /></el-icon>
            清空对话
          </el-button>
        </div>
      </div>

      <div class="messages-container" ref="messagesContainer">
        <div v-if="!chatStore.currentChatId || chatStore.chatHistory.length === 0" class="empty-chat">
          <el-empty description="暂无对话" />
          <p>请点击左侧"新聊天"按钮创建一个聊天</p>
        </div>
        
        <div v-else-if="messages.length === 0" class="empty-chat">
          <el-empty description="暂无消息" />
          <p>开始与{{ currentAgentName }}对话</p>
          <div class="agent-description">{{ currentAgentDescription }}</div>
        </div>
        
        <template v-else>
          <chat-message
            v-for="(message, index) in messages"
            :key="message.id || index"
            :content="message.content"
            :is-user="message.role === 'user'"
            :timestamp="message.timestamp"
            :loading="!!message.loading"
            :error="!!message.error"
            :is-step="!!message.isStep"
            :ai-avatar="currentAgentAvatar"
            :use-typewriter="isLatestAiMessage(message)"
          />
        </template>
      </div>

      <chat-input
        :is-processing="isProcessing"
        @send="sendMessage"
        @upload="handleFileUpload"
        ref="chatInputRef"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch, computed, onUnmounted } from 'vue'
import { Delete, Plus, Menu, Close, User, ChatDotSquare } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ChatMessage from '@/components/ChatMessage.vue'
import ChatInput from '@/components/ChatInput.vue'
import { useChatStore } from '@/stores/chat'
import { storeToRefs } from 'pinia'

const chatStore = useChatStore()
const { chatHistory, currentChatId, loadingMessages } = storeToRefs(chatStore)
const messages = ref([])
const isProcessing = computed(() => chatStore.isLoading || !!chatStore.currentStream)
const messagesContainer = ref(null)
const chatInputRef = ref(null)
const selectedAgentId = ref(chatStore.selectedAgent)
const isMobile = ref(false)
const showSidebar = ref(false)

// 计算最新AI消息
const isLatestAiMessage = (message) => {
  if (message.role !== 'assistant') return false
  
  // 获取所有AI消息
  const aiMessages = messages.value.filter(m => m.role === 'assistant')
  // 检查当前消息是否是最后一条AI消息
  return aiMessages.length > 0 && aiMessages[aiMessages.length - 1] === message
}

// 计算属性：获取当前智能体信息
const currentAgent = computed(() => {
  return chatStore.agentTypes.find(agent => agent.id === chatStore.selectedAgent) || {}
})

const currentAgentName = computed(() => currentAgent.value.name || '智能助手')
const currentAgentDescription = computed(() => currentAgent.value.description || '')
const currentAgentAvatar = computed(() => currentAgent.value.avatar || '/images/default-avatar.png')

// 检测设备类型
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    showSidebar.value = false
  }
}

// 切换侧边栏显示
const toggleSidebar = () => {
  showSidebar.value = !showSidebar.value
}

// 加载消息
onMounted(async () => {
  try {
    // 创建新聊天会话（如果没有当前聊天）
    if (!chatStore.currentChatId) {
      chatStore.createNewChat()
    }
    
    const loadedMessages = await chatStore.loadMessages()
    messages.value = loadedMessages || []
    
    scrollToBottom()
    chatInputRef.value?.focus()
    
    // 检测设备类型
    checkMobile()
    window.addEventListener('resize', checkMobile)
  } catch (error) {
    console.error('Failed to load messages:', error)
    ElMessage.error('加载消息失败')
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// 监听store中消息的变化
watch(() => chatStore.currentChat?.messages, (newMessages) => {
  if (newMessages) {
    messages.value = newMessages
    scrollToBottom()
  }
}, { deep: true })

// 滚动到消息容器底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 发送消息给AI
const sendMessage = async (text) => {
  try {
    // 使用流式响应发送消息
    const result = await chatStore.sendMessageStream(text)
    
    // 检查是否返回错误
    if (result && result.error) {
      ElMessage.warning({
        message: result.error,
        duration: 3000,
        showClose: true
      })
      return
    }
    
    if (result === false) {
      ElMessage.error('发送消息失败')
    }
    
    scrollToBottom()
    
    // 在移动端发送消息后关闭侧边栏
    if (isMobile.value && showSidebar.value) {
      showSidebar.value = false
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    ElMessage.error('发送消息失败')
  }
}

// 处理文件上传
const handleFileUpload = () => {
  ElMessage.info('文件上传功能尚未实现')
}

// 清空聊天记录
const clearChat = () => {
  ElMessageBox.confirm(
    '确定要清空所有聊天消息吗？',
    '清空聊天',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      chatStore.clearMessages()
      ElMessage.success('聊天已清空')
    })
    .catch(() => {
      // 用户取消操作
    })
}

// 创建新聊天
const createNewChat = () => {
  chatStore.createNewChat()
  ElMessage.success('已创建新聊天')
}

// 选择聊天
const selectChat = (chatId) => {
  chatStore.selectChat(chatId)
  
  // 在移动端选择聊天后关闭侧边栏
  if (isMobile.value) {
    showSidebar.value = false
  }
}

// 删除聊天
const deleteChat = (chatId) => {
  ElMessageBox.confirm(
    '确定要删除此聊天吗？',
    '删除聊天',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(() => {
      chatStore.deleteChat(chatId)
      ElMessage.success('聊天已删除')
    })
    .catch(() => {
      // 用户取消操作
    })
}

// 更改智能体
const changeAgent = (agentId) => {
  // 只更新选中的智能体，不创建新聊天
  chatStore.setSelectedAgent(agentId)
  selectedAgentId.value = agentId
}
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  width: 100%;
  background-color: var(--bg-color);
  position: relative;
  overflow: hidden;
}

.chat-sidebar {
  width: 260px;
  background-color: white;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: transform 0.3s ease;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h3 {
  margin: 0;
  font-weight: 600;
  color: var(--primary-color);
}

.sidebar-actions {
  display: flex;
  align-items: center;
}

.close-sidebar {
  margin-left: 8px;
}

.section-header {
  padding: 10px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid var(--border-color);
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  display: flex;
  align-items: center;
}

.section-title .el-icon {
  margin-right: 6px;
}

/* 智能体部分 */
.agent-section {
  border-bottom: 1px solid var(--border-color);
}

.agent-list {
  padding: 8px;
  max-height: 180px;
  overflow-y: auto;
}

.agent-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: var(--radius);
  margin-bottom: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.agent-item:hover {
  background-color: #f5f7fa;
}

.agent-item.active {
  background-color: #ecf5ff;
  box-shadow: 0 0 0 1px #1890ff;
}

.agent-avatar {
  flex-shrink: 0;
}

.agent-info {
  margin-left: 10px;
  overflow: hidden;
}

.agent-name {
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-description-short {
  font-size: 12px;
  color: var(--text-color-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 对话部分 */
.conversation-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-history {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-history {
  padding: 20px 0;
  text-align: center;
  color: var(--text-color-light);
  font-size: 14px;
}

.chat-history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: var(--radius);
  margin-bottom: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-left: 3px solid transparent;
}

.chat-history-item:hover {
  background-color: #f5f7fa;
}

.chat-history-item.active {
  background-color: #ecf5ff;
  border-left-color: #1890ff;
}

.chat-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  font-size: 14px;
}

.chat-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.chat-history-item:hover .chat-actions {
  opacity: 1;
}

.delete-btn {
  color: #909399;
  padding: 2px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  border-bottom: 1px solid var(--border-color);
  background-color: white;
}

.header-left {
  display: flex;
  align-items: center;
}

.current-agent-info {
  display: flex;
  align-items: center;
}

.current-agent-avatar {
  margin-right: 10px;
}

.menu-btn {
  margin-right: 12px;
}

.chat-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
}

.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-color-light);
  text-align: center;
  padding: 20px;
}

.empty-chat p {
  margin-top: 10px;
  margin-bottom: 16px;
}

.agent-description {
  max-width: 500px;
  line-height: 1.6;
  color: var(--text-color-light);
  font-size: 14px;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .chat-sidebar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    transform: translateX(-100%);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }
  
  .chat-sidebar.mobile-hidden {
    transform: translateX(-100%);
  }
  
  .chat-sidebar:not(.mobile-hidden) {
    transform: translateX(0);
  }
  
  .chat-header {
    padding: 0 12px;
    height: 56px;
  }
  
  .messages-container {
    padding: 12px;
  }
  
  .agent-list {
    max-height: 160px;
  }
}

@media (max-width: 480px) {
  .chat-header h2 {
    font-size: 16px;
  }
}
</style>
