<script setup>
import { RouterView } from 'vue-router'
import { useSettingsStore } from './stores/settings'
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

// 初始化设置
const settingsStore = useSettingsStore()
const route = useRoute()

// 更新页面元信息
const updateMetaTags = (meta) => {
  if (!meta) return
  
  // 设置描述
  let descriptionTag = document.querySelector('meta[name="description"]')
  if (!descriptionTag) {
    descriptionTag = document.createElement('meta')
    descriptionTag.setAttribute('name', 'description')
    document.head.appendChild(descriptionTag)
  }
  descriptionTag.setAttribute('content', meta.description || '智能AI助手，包含旅游助手和Agent智能体，为您提供智能对话和信息查询服务')
  
  // 设置关键词
  let keywordsTag = document.querySelector('meta[name="keywords"]')
  if (!keywordsTag) {
    keywordsTag = document.createElement('meta')
    keywordsTag.setAttribute('name', 'keywords')
    document.head.appendChild(keywordsTag)
  }
  keywordsTag.setAttribute('content', meta.keywords || 'AI助手,旅游助手,智能体,对话,知识库')
}

// 监听路由变化更新页面标题和元信息
watch(() => route.meta, (meta) => {
  if (meta.title) {
    document.title = `${meta.title} | Lei AI Agent`
  } else {
    document.title = 'Lei AI Agent - 智能助手'
  }
  
  // 更新元信息
  updateMetaTags(meta)
})

onMounted(() => {
  // 初始化主题
  settingsStore.initializeTheme()
  
  // 初始化元信息
  updateMetaTags(route.meta)
})
</script>

<template>
  <div class="app-container">
    <RouterView />
  </div>
</template>

<style>
/* 全局CSS */
:root {
  --primary-color: #409EFF;
  --success-color: #67C23A;
  --warning-color: #E6A23C;
  --danger-color: #F56C6C;
  --info-color: #909399;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #333;
  line-height: 1.6;
  height: 100vh;
  overflow: hidden;
}

.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 主题变化 */
body.theme-dark {
  background-color: #121212;
  color: #f1f1f1;
  --bg-color: #1e1e1e;
  --card-bg: #2c2c2c;
  --text-color: #f1f1f1;
  --text-color-light: #d0d0d0;
  --border-color: #3e3e3e;
}

body.theme-light {
  background-color: var(--bg-color);
  color: var(--text-color);
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 无障碍焦点样式 */
:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .app-container {
    overflow-x: hidden;
  }
}
</style>
