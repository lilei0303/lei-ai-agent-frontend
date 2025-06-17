<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2>设置</h2>
      <el-button type="primary" @click="saveSettings">保存设置</el-button>
    </div>

    <div class="settings-content">
      <el-tabs v-model="activeTab" class="settings-tabs" :stretch="isMobile">
        <el-tab-pane label="API设置" name="api">
          <div class="settings-section">
            <h3>API配置</h3>
            <el-form label-position="top">
              <el-form-item label="API端点">
                <el-input v-model="settings.api.endpoint" placeholder="https://api.example.com/v1" />
              </el-form-item>
              
              <el-form-item label="API密钥">
                <el-input 
                  v-model="settings.api.apiKey" 
                  placeholder="您的API密钥" 
                  show-password
                />
              </el-form-item>
              
              <el-form-item label="模型">
                <el-select v-model="settings.api.model" placeholder="选择模型" class="full-width">
                  <el-option label="GPT-4" value="gpt-4" />
                  <el-option label="GPT-3.5 Turbo" value="gpt-3.5-turbo" />
                  <el-option label="Claude 3" value="claude-3" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="温度">
                <el-slider 
                  v-model="settings.api.temperature" 
                  :min="0" 
                  :max="1" 
                  :step="0.1" 
                  show-stops
                />
                <div class="slider-labels">
                  <span>更精确</span>
                  <span>更创造性</span>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="用户设置" name="user">
          <div class="settings-section">
            <h3>个人资料</h3>
            <el-form label-position="top">
              <el-form-item label="显示名称">
                <el-input v-model="settings.user.displayName" placeholder="您的显示名称" />
              </el-form-item>
              
              <el-form-item label="邮箱">
                <el-input v-model="settings.user.email" placeholder="您的邮箱" disabled />
              </el-form-item>
              
              <el-form-item label="头像">
                <div class="avatar-upload">
                  <el-avatar :size="80" :src="settings.user.avatar || defaultAvatar" />
                  <el-upload
                    class="avatar-uploader"
                    action="#"
                    :auto-upload="false"
                    :show-file-list="false"
                    :on-change="handleAvatarChange"
                  >
                    <el-button type="primary" plain>更换头像</el-button>
                  </el-upload>
                </div>
              </el-form-item>
            </el-form>
            
            <h3>密码</h3>
            <el-form label-position="top">
              <el-form-item label="当前密码">
                <el-input 
                  v-model="passwordForm.currentPassword" 
                  type="password" 
                  placeholder="当前密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item label="新密码">
                <el-input 
                  v-model="passwordForm.newPassword" 
                  type="password" 
                  placeholder="新密码"
                  show-password
                />
              </el-form-item>
              
              <el-form-item label="确认新密码">
                <el-input 
                  v-model="passwordForm.confirmPassword" 
                  type="password" 
                  placeholder="确认新密码"
                  show-password
                />
              </el-form-item>
              
              <el-button type="primary" @click="changePassword" :disabled="!canChangePassword">
                修改密码
              </el-button>
            </el-form>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="应用设置" name="app">
          <div class="settings-section">
            <h3>界面设置</h3>
            <el-form label-position="top">
              <el-form-item label="主题">
                <el-radio-group v-model="settings.app.theme" class="theme-selector">
                  <el-radio-button label="light">浅色</el-radio-button>
                  <el-radio-button label="dark">深色</el-radio-button>
                  <el-radio-button label="system">跟随系统</el-radio-button>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="语言">
                <el-select v-model="settings.app.language" class="full-width">
                  <el-option label="中文" value="zh" />
                  <el-option label="English" value="en" />
                  <el-option label="Español" value="es" />
                </el-select>
              </el-form-item>
              
              <el-form-item>
                <el-checkbox v-model="settings.app.enableNotifications">
                  启用通知
                </el-checkbox>
              </el-form-item>
              
              <el-form-item>
                <el-checkbox v-model="settings.app.enableSounds">
                  启用声音
                </el-checkbox>
              </el-form-item>
            </el-form>
            
            <h3>聊天设置</h3>
            <el-form label-position="top">
              <el-form-item label="消息显示样式">
                <el-radio-group v-model="settings.app.messageDisplay">
                  <el-radio label="modern">现代</el-radio>
                  <el-radio label="classic">经典</el-radio>
                </el-radio-group>
              </el-form-item>
              
              <el-form-item label="字体大小">
                <el-slider 
                  v-model="settings.app.fontSize" 
                  :min="12" 
                  :max="20" 
                  :step="1" 
                  show-stops
                />
                <div class="slider-labels">
                  <span>小</span>
                  <span>大</span>
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'

const settingsStore = useSettingsStore()
const userStore = useUserStore()

const activeTab = ref('api')
const defaultAvatar = '/default-avatar.png'
const isMobile = ref(false)

// Settings model
const settings = ref({
  api: {
    endpoint: '',
    apiKey: '',
    model: 'gpt-4',
    temperature: 0.7
  },
  user: {
    displayName: '',
    email: '',
    avatar: ''
  },
  app: {
    theme: 'light',
    language: 'zh',
    enableNotifications: true,
    enableSounds: true,
    messageDisplay: 'modern',
    fontSize: 14
  }
})

// Password change form
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Check if password can be changed
const canChangePassword = computed(() => {
  return (
    passwordForm.value.currentPassword && 
    passwordForm.value.newPassword && 
    passwordForm.value.confirmPassword &&
    passwordForm.value.newPassword === passwordForm.value.confirmPassword
  )
})

// 检测设备类型
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// Load settings
onMounted(async () => {
  try {
    // Load settings from store
    const appSettings = await settingsStore.getSettings()
    const userData = userStore.user
    
    // Update settings model
    settings.value = {
      ...settings.value,
      api: { ...appSettings.api },
      app: { ...appSettings.app }
    }
    
    // Update user data
    if (userData) {
      settings.value.user = {
        displayName: userData.displayName || userData.username,
        email: userData.email || '',
        avatar: userData.avatar || ''
      }
    }
    
    // 检测设备类型
    checkMobile()
    window.addEventListener('resize', checkMobile)
  } catch (error) {
    console.error('Failed to load settings:', error)
    ElMessage.error('加载设置失败')
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

// Save settings
const saveSettings = async () => {
  try {
    await settingsStore.updateSettings({
      api: settings.value.api,
      app: settings.value.app
    })
    
    // Update user profile
    await userStore.updateProfile({
      displayName: settings.value.user.displayName,
      avatar: settings.value.user.avatar
    })
    
    ElMessage.success('设置保存成功')
  } catch (error) {
    console.error('Failed to save settings:', error)
    ElMessage.error('保存设置失败')
  }
}

// Change password
const changePassword = async () => {
  if (!canChangePassword.value) return
  
  try {
    await userStore.changePassword(
      passwordForm.value.currentPassword,
      passwordForm.value.newPassword
    )
    
    ElMessage.success('密码修改成功')
    
    // Clear password form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    console.error('Failed to change password:', error)
    ElMessage.error('修改密码失败')
  }
}

// Handle avatar change
const handleAvatarChange = (file) => {
  if (!file) return
  
  // In a real app, you would upload the file to a server
  // For now, we'll just use a data URL
  const reader = new FileReader()
  reader.onload = (e) => {
    settings.value.user.avatar = e.target.result
  }
  reader.readAsDataURL(file.raw)
}
</script>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  border-bottom: 1px solid var(--border-color);
  background-color: white;
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.settings-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: var(--bg-color);
}

.settings-tabs {
  background-color: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

.settings-section {
  padding: 20px;
}

.settings-section h3 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  color: var(--text-color-light);
  font-size: 12px;
}

.avatar-upload {
  display: flex;
  align-items: center;
  gap: 20px;
}

.full-width {
  width: 100%;
}

.theme-selector {
  width: 100%;
  display: flex;
}

.theme-selector :deep(.el-radio-button) {
  flex: 1;
}

.theme-selector :deep(.el-radio-button__inner) {
  width: 100%;
}

@media (max-width: 768px) {
  .settings-header {
    padding: 0 16px;
    height: 56px;
  }
  
  .settings-content {
    padding: 16px;
  }
  
  .settings-section {
    padding: 15px;
  }
  
  .avatar-upload {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

@media (max-width: 480px) {
  .settings-header h2 {
    font-size: 16px;
  }
  
  .settings-content {
    padding: 12px;
  }
  
  .settings-section {
    padding: 12px;
  }
}
</style>
