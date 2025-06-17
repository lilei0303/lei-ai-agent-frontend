# Lei AI Agent 前端

这是 Lei AI Agent 的前端项目，专为与 lei-ai-agent-backend 配合使用而设计。它为 AI 助手的功能提供了现代化的 Web 界面。

## 核心功能

- **AI 聊天界面**：通过响应式聊天界面与 AI 智能体交互
- **知识库管理**：查看和管理 AI 使用的知识
- **设置与配置**：自定义 AI 智能体的行为
- **用户认证**：安全的登录系统
## 界面展示
![image](https://github.com/user-attachments/assets/9caeb1bc-67cc-4307-a07b-6cabd9aa3119)
![image](https://github.com/user-attachments/assets/735e7615-1a1e-4a6c-9daf-10c2bae21e4e)
![image](https://github.com/user-attachments/assets/423b89f0-b17b-4f5d-b32c-b75778a82f8f)

## 技术栈

- **Vue 3**：渐进式 JavaScript 框架
- **Vue Router**：Vue.js 官方路由
- **Pinia**：Vue 的状态管理库
- **Element Plus**：UI 组件库
- **Axios**：基于 Promise 的 HTTP 客户端
- **Markdown 支持**：使用 vue3-markdown-it 和 highlight.js 渲染

## 响应式设计

- 支持桌面端、平板和移动端的现代响应式布局
- 为移动设备优化的导航和交互体验
- 可折叠侧边栏，提升空间利用率
- 统一的设计系统和一致的 CSS 变量

## UI/UX 改进

- 视觉吸引力强的消息气泡，带有对齐和箭头设计
- 步骤消息和错误反馈的增强显示样式
- 动态文本显示的打字机效果
- 带有视觉反馈的优化表单和输入控件

## SEO 优化

- 完整的元标签实现
- 动态页面标题和描述
- Open Graph 协议支持
- 语义化 HTML 结构

## 开发指南

### 安装

```bash
npm install
```

### 开发服务器

```bash
npm run dev
```

### 生产构建

```bash
npm run build
```

### 代码检查

```bash
npm run lint
```

## 与后端的连接

此前端设计为与 lei-ai-agent-backend 服务配合使用。它通过以下 API 端点进行通信：

- 智能体 API：执行任务并获取流式响应
- 聊天 API：普通和 RAG 增强型聊天功能
- 知识 API：管理和查询知识库
- 用户 API：认证和用户管理
