<template>
  <div class="app-layout">
    <el-container>
      <!-- Mobile Header -->
      <el-header v-if="isMobile" class="mobile-header">
        <div class="mobile-header-content">
          <div class="logo">
            <img src="/favicon.ico" alt="Lei AI Agent" />
            <span class="logo-text">Lei AI</span>
          </div>
          
          <el-button class="menu-toggle" @click="showMobileMenu = !showMobileMenu" text>
            <el-icon size="24"><Menu /></el-icon>
          </el-button>
        </div>
        
        <!-- Mobile Menu Drawer -->
        <el-drawer
          v-model="showMobileMenu"
          direction="ltr"
          size="200px"
          :with-header="false"
        >
          <div class="mobile-menu">
            <div class="mobile-menu-header">
              <img src="/favicon.ico" alt="Lei AI Agent" />
              <span>Lei AI Agent</span>
            </div>
            
            <el-menu 
              :default-active="activeMenu" 
              class="mobile-menu-items" 
              :router="true"
            >
              <el-menu-item index="/chat">
                <el-icon><ChatDotRound /></el-icon>
                <span>对话</span>
              </el-menu-item>
              
              <el-menu-item index="/knowledge">
                <el-icon><Reading /></el-icon>
                <span>知识库</span>
              </el-menu-item>
              
              <el-menu-item index="/settings">
                <el-icon><Setting /></el-icon>
                <span>设置</span>
              </el-menu-item>
            </el-menu>
          </div>
        </el-drawer>
      </el-header>
      
      <!-- Desktop Sidebar Navigation Menu -->
      <el-aside v-if="!isMobile" :width="isCollapsed ? '64px' : '200px'" class="sidebar">
        <div class="logo">
          <img src="/favicon.ico" alt="Lei AI Agent" />
          <span v-if="!isCollapsed" class="logo-text">Lei AI</span>
        </div>
        
        <el-menu 
          :default-active="activeMenu" 
          class="sidebar-menu" 
          :router="true" 
          :collapse="isCollapsed"
        >
          <el-menu-item index="/chat" title="对话">
            <el-icon><ChatDotRound /></el-icon>
            <template #title>对话</template>
          </el-menu-item>
          
          <el-menu-item index="/knowledge" title="知识库">
            <el-icon><Reading /></el-icon>
            <template #title>知识库</template>
          </el-menu-item>
          
          <el-menu-item index="/settings" title="设置">
            <el-icon><Setting /></el-icon>
            <template #title>设置</template>
          </el-menu-item>
        </el-menu>
        
        <div class="sidebar-footer">
          <el-button 
            class="collapse-btn" 
            @click="toggleSidebar" 
            :icon="isCollapsed ? Expand : Fold"
            circle
          />
        </div>
      </el-aside>
      
      <!-- Main Content Area -->
      <el-container class="main-container">
        <el-main>
          <router-view></router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChatDotRound, Reading, Setting, Fold, Expand, Menu } from '@element-plus/icons-vue'

const route = useRoute()
const isCollapsed = ref(false)
const showMobileMenu = ref(false)
const isMobile = ref(false)

// Current active menu item
const activeMenu = computed(() => route.path)

// Toggle sidebar collapse state
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
  localStorage.setItem('sidebarCollapsed', isCollapsed.value)
}

// Check if viewport is mobile size
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// Close mobile menu when route changes
watch(() => route.path, () => {
  showMobileMenu.value = false
})

onMounted(() => {
  // Restore sidebar state
  const savedState = localStorage.getItem('sidebarCollapsed')
  if (savedState !== null) {
    isCollapsed.value = savedState === 'true'
  }
  
  // Check initial viewport size
  checkMobile()
  
  // Add resize listener
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  // Remove resize listener
  window.removeEventListener('resize', checkMobile)
})
</script>

<style scoped>
.app-layout {
  height: 100vh;
  width: 100%;
}

/* Sidebar styles */
.sidebar {
  height: 100vh;
  background-color: #001529;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  transition: width 0.3s;
  overflow-y: auto;
  position: relative;
}

.logo {
  padding: 16px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  height: 60px;
}

.logo img {
  width: 32px;
  height: 32px;
}

.logo-text {
  margin-left: 8px;
  font-size: 18px;
  font-weight: 500;
  white-space: nowrap;
  opacity: 1;
  transition: opacity 0.3s;
}

.sidebar-menu {
  border-right: none;
  background-color: transparent;
}

.sidebar-menu :deep(.el-menu-item) {
  display: flex;
  align-items: center;
  height: 56px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.65);
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background-color: #1890ff;
}

.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.collapse-btn {
  color: rgba(255, 255, 255, 0.65);
  background-color: rgba(255, 255, 255, 0.1);
}

/* Mobile Header styles */
.mobile-header {
  padding: 0;
  background-color: #001529;
  color: white;
  height: 56px;
  line-height: 56px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 1000;
}

.mobile-header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 16px;
}

.menu-toggle {
  color: white;
  font-size: 20px;
}

/* Mobile Menu styles */
.mobile-menu {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mobile-menu-header {
  padding: 16px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.mobile-menu-header img {
  width: 32px;
  height: 32px;
  margin-right: 12px;
}

.mobile-menu-items {
  border-right: none;
}

/* Main container styles */
.main-container {
  height: 100vh;
  overflow: hidden;
}

.el-main {
  padding: 0;
  overflow: hidden;
  background-color: var(--bg-color);
}
</style> 