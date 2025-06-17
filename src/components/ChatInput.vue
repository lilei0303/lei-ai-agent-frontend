<template>
  <div class="chat-input-container">
    <el-input
      v-model="messageText"
      type="textarea"
      :rows="2"
      :placeholder="placeholder"
      resize="none"
      @keydown.enter.prevent="handleEnterKey"
      @keydown.shift.enter="handleShiftEnter"
      ref="inputRef"
      class="message-input"
      :class="{ 'is-mobile': isMobile }"
    />
    <div class="input-actions">
      <el-tooltip content="上传文件" placement="top" :hide-after="1500">
        <el-button
          class="action-button"
          :icon="Upload"
          circle
          @click="handleUpload"
          :disabled="isProcessing"
        />
      </el-tooltip>
      <el-button
        type="primary"
        :icon="Position"
        circle
        @click="sendMessage"
        :loading="isProcessing"
        :disabled="!canSend"
        class="send-button"
      />
    </div>
    
    <div class="input-footer">
      <div class="input-tips">
        按 Enter 发送，Shift+Enter 换行
      </div>
      <div class="char-count" :class="{ 'near-limit': isNearLimit }">
        {{ messageText.length }} / {{ maxLength }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Position, Upload } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  isProcessing: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: '输入消息...'
  },
  maxLength: {
    type: Number,
    default: 2000
  }
})

const emit = defineEmits(['send', 'upload'])

const messageText = ref('')
const inputRef = ref(null)
const isMobile = ref(false)

// 检查是否接近字符限制
const isNearLimit = computed(() => {
  return messageText.value.length > props.maxLength * 0.8
})

// Check if message can be sent
const canSend = computed(() => {
  return messageText.value.trim().length > 0 && 
         messageText.value.length <= props.maxLength &&
         !props.isProcessing
})

// Handle Enter key (send message)
const handleEnterKey = (e) => {
  // If Enter without Shift, send message
  if (!e.shiftKey) {
    sendMessage()
  }
}

// Handle Shift+Enter (new line)
const handleShiftEnter = () => {
  // Do nothing, default behavior will add a new line
}

// Send message
const sendMessage = () => {
  if (!canSend.value) {
    if (messageText.value.length > props.maxLength) {
      ElMessage.warning(`消息过长 (最大 ${props.maxLength} 字符)`)
    }
    return
  }
  
  const trimmedMessage = messageText.value.trim()
  emit('send', trimmedMessage)
  messageText.value = ''
  
  // Focus back on input after sending
  nextTick(() => {
    inputRef.value?.focus()
  })
}

// Handle file upload
const handleUpload = () => {
  if (props.isProcessing) return
  emit('upload')
}

// 检测设备类型
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Expose methods to parent component
defineExpose({
  focus: () => {
    inputRef.value?.focus()
  },
  clear: () => {
    messageText.value = ''
  }
})
</script>

<style scoped>
.chat-input-container {
  display: flex;
  flex-direction: column;
  padding: 12px 16px;
  background-color: white;
  border-top: 1px solid var(--border-color);
  position: relative;
}

.message-input {
  border-radius: 8px;
  transition: all 0.3s;
}

.message-input :deep(.el-textarea__inner) {
  min-height: 60px;
  padding: 12px;
  font-size: 15px;
  line-height: 1.5;
  border-radius: 8px;
  resize: none;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #dcdfe6;
  transition: all 0.3s;
}

.message-input :deep(.el-textarea__inner:focus) {
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
  border-color: #409EFF;
}

.input-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  position: absolute;
  right: 24px;
  bottom: 56px;
}

.action-button {
  color: #909399;
  background-color: #f5f7fa;
  border: none;
}

.send-button {
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  padding: 0 4px;
}

.input-tips {
  font-size: 12px;
  color: #909399;
}

.char-count {
  font-size: 12px;
  color: #909399;
  transition: color 0.3s;
}

.char-count.near-limit {
  color: #E6A23C;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .chat-input-container {
    padding: 10px;
  }
  
  .message-input.is-mobile :deep(.el-textarea__inner) {
    min-height: 48px;
    padding: 10px;
    font-size: 14px;
  }
  
  .input-actions {
    bottom: 50px;
    right: 16px;
  }
  
  .input-footer {
    margin-top: 6px;
  }
}
</style> 