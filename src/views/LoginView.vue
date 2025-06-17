<template>
  <div class="login-container">
    <div class="login-form">
      <h1 class="title">Lei AI Agent</h1>
      <div class="subtitle">AI Assistant Login</div>
      
      <el-form :model="loginForm" :rules="rules" ref="loginFormRef" label-position="top">
        <el-form-item label="Username" prop="username">
          <el-input 
            v-model="loginForm.username" 
            placeholder="Enter username" 
            :prefix-icon="User"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item label="Password" prop="password">
          <el-input 
            v-model="loginForm.password" 
            type="password" 
            placeholder="Enter password" 
            :prefix-icon="Lock"
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            :loading="isLoggingIn" 
            class="login-button" 
            @click="handleLogin"
          >
            Login
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const loginFormRef = ref(null)
const isLoggingIn = ref(false)

// Form data
const loginForm = reactive({
  username: '',
  password: ''
})

// Form validation rules
const rules = {
  username: [
    { required: true, message: 'Please enter username', trigger: 'blur' },
    { min: 3, message: 'Username must be at least 3 characters', trigger: 'blur' }
  ],
  password: [
    { required: true, message: 'Please enter password', trigger: 'blur' },
    { min: 6, message: 'Password must be at least 6 characters', trigger: 'blur' }
  ]
}

// Login handler
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        isLoggingIn.value = true
        console.log('Login attempt with:', { 
          username: loginForm.username,
          passwordLength: loginForm.password.length
        })
        
        const result = await userStore.login(loginForm.username, loginForm.password)
        
        if (result) {
          console.log('Login successful, token:', localStorage.getItem('token'))
          console.log('Store authentication state:', userStore.isAuthenticated)
          
          ElMessage.success('Login successful')
          
          // Force token check before navigation
          if (localStorage.getItem('token')) {
            console.log('Token verified, navigating to /chat')
            router.push('/chat').catch(err => {
              console.error('Navigation error:', err)
            })
          } else {
            console.error('Token not set correctly after login')
            ElMessage.error('Authentication error')
          }
        } else {
          ElMessage.error('Login failed, please check username and password')
        }
      } catch (error) {
        console.error('Login error:', error)
        ElMessage.error('Login error, please try again later')
      } finally {
        isLoggingIn.value = false
      }
    }
  })
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.login-form {
  width: 400px;
  padding: 40px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  color: #409EFF;
  margin-bottom: 8px;
  font-size: 28px;
}

.subtitle {
  text-align: center;
  color: #606266;
  margin-bottom: 30px;
  font-size: 16px;
}

.login-button {
  width: 100%;
  padding: 12px 15px;
  font-size: 16px;
}

@media (max-width: 480px) {
  .login-form {
    width: 90%;
    padding: 30px 20px;
  }
}
</style> 