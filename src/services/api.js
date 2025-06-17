import axios from 'axios'

// 创建axios实例，设置基础配置
const api = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 添加请求拦截器
api.interceptors.request.use(config => {
  console.log('发送请求:', config.url, config.params || config.data)
  return config
}, error => {
  console.error('请求拦截器错误:', error)
  return Promise.reject(error)
})

// 添加响应拦截器处理错误
api.interceptors.response.use(
  response => {
    console.log('响应成功:', response.status, response.config.url)
    return response
  },
  error => {
    console.error('API错误:', error.message, error.config?.url, error.response?.status)
    
    // 处理服务器错误
    if (error.response && error.response.status === 500) {
      console.error('服务器内部错误:', error.response.data)
    }
    
    return Promise.reject(error)
  }
)

// 基础API URL，用于EventSource等直接请求
const getBaseUrl = () => {
  // 开发环境下使用相对路径
  if (import.meta.env.DEV) {
    return ''
  }
  
  // 生产环境使用完整URL
  const host = window.location.host
  const protocol = window.location.protocol
  return `${protocol}//${host}`
}

// 智能体服务
export const agentService = {
  // 执行智能体任务（同步模式）
  async executeTask(prompt) {
    try {
      const response = await api.post('/agent/execute', { prompt })
      return response.data
    } catch (error) {
      console.error('执行任务失败:', error)
      throw error
    }
  },

  // 执行高级智能体任务（同步模式）
  async executeAdvancedTask(request) {
    try {
      const response = await api.post('/agent/execute/advanced', request)
      return response.data
    } catch (error) {
      console.error('执行高级任务失败:', error)
      throw error
    }
  },

  // 获取智能体流式响应URL
  getTaskStreamUrl(prompt) {
    // 确保URL参数正确编码
    const encodedPrompt = encodeURIComponent(prompt)
    return `${getBaseUrl()}/api/agent/stream?prompt=${encodedPrompt}`
  },

  // 获取高级智能体流式响应URL
  getAdvancedTaskStreamUrl() {
    // 已弃用，请使用postAdvancedStreamRequest
    console.warn('getAdvancedTaskStreamUrl方法已弃用，请使用postAdvancedStreamRequest方法');
    return `${getBaseUrl()}/api/agent/stream/advanced`;
  },
  
  // 发送聊天流式请求 (Travel Assistant专用)
  async postChatStreamRequest(message, chatId, systemPrompt = null) {
    try {
      // 将参数编码成URL参数
      const safeMessage = encodeURIComponent(message);
      const safeChatId = encodeURIComponent(chatId || `chat_${Date.now()}`);
      const safeSystemPrompt = encodeURIComponent(systemPrompt || '');
      
      // 构建URL
      const url = `${getBaseUrl()}/api/ai/chat/stream?message=${safeMessage}&chatId=${safeChatId}${safeSystemPrompt ? '&systemPrompt=' + safeSystemPrompt : ''}`;
      
      console.log('发送聊天流式请求URL:', url);
      
      // 发送GET请求
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP错误! 状态: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('发送聊天流式请求失败:', error);
      throw error;
    }
  },
  
  // 构建高级智能体请求体
  buildAdvancedRequest(message, chatId, systemPrompt = null) {
    return {
      prompt: message,
      sessionId: chatId || `session_${Date.now()}`,
      systemPrompt: systemPrompt || '',
      maxSteps: 10
    }
  },
  
  // 发送高级流式请求
  async postAdvancedStreamRequest(message, chatId, systemPrompt = null) {
    try {
      // 构建请求体，确保与后端AgentRequestVO类结构匹配
      const requestBody = {
        prompt: message,
        sessionId: chatId || `session_${Date.now()}`,
        systemPrompt: systemPrompt || '',
        maxSteps: 10
      };
      
      console.log('发送高级流式请求参数:', requestBody);
      
      // 尝试不同的内容类型
      const contentTypes = [
        'application/json',
        'application/json;charset=UTF-8',
        'application/x-www-form-urlencoded'
      ];
      
      let response = null;
      let lastError = null;
      
      // 依次尝试不同的内容类型
      for (const contentType of contentTypes) {
        try {
          console.log(`尝试使用 Content-Type: ${contentType}`);
          
          // 准备headers
          const headers = {
            'Content-Type': contentType,
            'Accept': 'application/json, text/plain, */*',
            'Cache-Control': 'no-cache'
          };
          
          // 根据内容类型准备请求体
          let body;
          if (contentType === 'application/x-www-form-urlencoded') {
            const params = new URLSearchParams();
            Object.entries(requestBody).forEach(([key, value]) => {
              params.append(key, typeof value === 'string' ? value : String(value));
            });
            body = params;
          } else {
            body = JSON.stringify(requestBody);
          }
          
          // 发送请求
          const fetchResponse = await fetch(`${getBaseUrl()}/api/agent/stream/advanced`, {
            method: 'POST',
            headers,
            body
          });
          
          if (!fetchResponse.ok) {
            console.log(`Content-Type ${contentType} 失败，错误码:`, fetchResponse.status);
            throw new Error(`HTTP错误! 状态: ${fetchResponse.status}`);
          }
          
          console.log(`Content-Type ${contentType} 成功!`);
          response = fetchResponse;
          break;
        } catch (err) {
          console.log(`Content-Type ${contentType} 尝试失败:`, err.message);
          lastError = err;
        }
      }
      
      // 如果所有尝试都失败，抛出最后一个错误
      if (!response) {
        throw lastError || new Error('所有Content-Type尝试均失败');
      }
      
      return response;
    } catch (error) {
      console.error('发送高级流式请求失败:', error);
      throw error;
    }
  },

  // 获取智能体状态
  async getStatus() {
    try {
      const response = await api.get('/agent/status')
      return response.data
    } catch (error) {
      console.error('获取状态失败:', error)
      return { status: 'error', message: error.message }
    }
  },

  // 重置智能体
  async resetAgent() {
    try {
      const response = await api.post('/agent/reset')
      return response.data
    } catch (error) {
      console.error('重置智能体失败:', error)
      throw error
    }
  },

  // 关闭流式连接
  async closeStream(sessionId) {
    try {
      const response = await api.post(`/agent/stream/close/${sessionId}`)
      return response.data
    } catch (error) {
      console.error('关闭流失败:', error)
      return { success: false, error: error.message }
    }
  }
}

// AI聊天服务
export const chatService = {
  // 同步聊天
  async getChat(message, chatId) {
    try {
      const response = await api.post('/ai/chat', { message, chatId })
      return response.data
    } catch (error) {
      console.error('获取聊天失败:', error)
      throw error
    }
  },

  // 获取流式聊天响应URL
  getChatStreamUrl(message, chatId) {
    // 确保URL参数正确编码
    const safeMessage = encodeURIComponent(message)
    const safeChatId = encodeURIComponent(chatId || '')
    return `${getBaseUrl()}/api/ai/chat/stream?message=${safeMessage}&chatId=${safeChatId}`
  },

  // 获取带工具的流式聊天URL
  getChatWithToolsUrl(message, chatId) {
    const safeMessage = encodeURIComponent(message)
    const safeChatId = encodeURIComponent(chatId || '')
    return `${getBaseUrl()}/api/ai/chat/tools?message=${safeMessage}&chatId=${safeChatId}`
  },

  // 获取结构化聊天报告
  async getChatReport(message, chatId) {
    try {
      const response = await api.post('/ai/chat/report', { message, chatId })
      return response.data
    } catch (error) {
      console.error('获取聊天报告失败:', error)
      throw error
    }
  }
}

// 知识库问答服务
export const ragService = {
  // 获取基于知识库的聊天URL
  getRagChatUrl(message, chatId) {
    const safeMessage = encodeURIComponent(message)
    const safeChatId = encodeURIComponent(chatId || '')
    return `${getBaseUrl()}/api/rag/chat?message=${safeMessage}&chatId=${safeChatId}`
  }
}

export default api
