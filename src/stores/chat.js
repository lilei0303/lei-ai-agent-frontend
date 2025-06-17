import { defineStore } from 'pinia'
import { chatService, agentService, ragService } from '@/services/api'

export const useChatStore = defineStore('chat', {
  state: () => ({
    chatHistory: JSON.parse(localStorage.getItem('chatHistory') || '[]'),
    currentChatId: localStorage.getItem('currentChatId') || '',
    isLoading: false,
    streamingResponse: '',
    currentStream: null, // 当前的EventSource实例
    
    // 可用的智能体类型
    agentTypes: [
      {
        id: 'super-agent',
        name: 'Super Agent',
        description: 'General-purpose intelligent assistant that can answer various questions and provide professional advice in multiple domains.',
        avatar: '/images/avatar-super.png',
        apiType: 'advanced-agent',
        systemPrompt: 'You are a helpful, harmless, and honest AI assistant.'
      },
      {
        id: 'travel-agent',
        name: 'Travel Assistant',
        description: 'Specializes in travel-related questions, providing recommendations for tourist attractions, itinerary planning, transportation advice, and accommodation suggestions.',
        avatar: '/images/avatar-travel.png',
        apiType: 'chat',
        systemPrompt: 'You are a travel assistant AI. Help users plan their trips, recommend destinations, accommodations, and activities. Give detailed travel advice based on user preferences.'
      }
    ],
    selectedAgent: 'super-agent'
  }),
  
  getters: {
    currentChat: (state) => {
      return state.chatHistory.find(chat => chat.id === state.currentChatId) || null
    },
    
    sortedChatHistory: (state) => {
      return [...state.chatHistory].sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime))
    },
    
    currentAgentConfig: (state) => {
      return state.agentTypes.find(agent => agent.id === state.selectedAgent) || state.agentTypes[0]
    }
  },
  
  actions: {
    createNewChat(agentId = null) {
      const id = 'chat_' + Date.now()
      const agent = agentId || this.selectedAgent
      
      const newChat = {
        id,
        title: 'New Conversation',
        messages: [],
        agentId: agent,
        lastMessageTime: new Date().toISOString()
      }
      
      this.chatHistory.push(newChat)
      this.currentChatId = id
      this.saveToLocalStorage()
      
      return id
    },
    
    selectChat(chatId) {
      // 关闭之前的流式响应（如果有）
      if (this.currentStream) {
        this.currentStream.close()
        this.currentStream = null
      }
      
      this.currentChatId = chatId
      localStorage.setItem('currentChatId', chatId)
    },
    
    addMessage(message) {
      // 如果没有当前聊天ID，返回false而不是自动创建新聊天
      if (!this.currentChatId) {
        console.warn('没有当前聊天，无法添加消息');
        return false;
      }
      
      const currentChat = this.chatHistory.find(chat => chat.id === this.currentChatId)
      
      if (currentChat) {
        currentChat.messages.push(message)
        
        // 根据第一条用户消息更新聊天标题
        if (message.role === 'user' && currentChat.messages.filter(m => m.role === 'user').length === 1) {
          currentChat.title = message.content.substring(0, 20) + (message.content.length > 20 ? '...' : '')
        }
        
        currentChat.lastMessageTime = message.timestamp
        this.saveToLocalStorage()
        return true;
      }
      
      return false;
    },
    
    saveToLocalStorage() {
      localStorage.setItem('chatHistory', JSON.stringify(this.chatHistory))
      localStorage.setItem('currentChatId', this.currentChatId)
    },
    
    deleteChat(chatId) {
      const index = this.chatHistory.findIndex(chat => chat.id === chatId)
      
      if (index !== -1) {
        this.chatHistory.splice(index, 1)
        
        // 如果删除了当前聊天，选择另一个聊天或创建新的
        if (this.currentChatId === chatId) {
          if (this.chatHistory.length > 0) {
            this.currentChatId = this.chatHistory[0].id
          } else {
            this.currentChatId = ''
          }
        }
        
        this.saveToLocalStorage()
      }
    },
    
    setSelectedAgent(agentId) {
      this.selectedAgent = agentId
    },
    
    async loadMessages() {
      // 从本地存储加载消息
      return this.currentChat ? this.currentChat.messages : []
    },
    
    async clearMessages() {
      if (this.currentChat) {
        this.currentChat.messages = []
        this.saveToLocalStorage()
      }
    },
    
    // 新增方法：通过流式响应发送消息
    async sendMessageStream(text) {
      if (!text.trim()) return false
      
      try {
        // 确保有当前聊天
        if (!this.currentChatId) {
          // 不再自动创建新聊天，而是返回错误
          console.warn('没有选择聊天，请先创建新聊天');
          return { error: '请先创建新聊天或选择一个聊天' };
        }
        
        const timestamp = new Date().toISOString()
        
        // 添加用户消息
        const messageAdded = this.addMessage({
          role: 'user',
          content: text,
          timestamp
        })
        
        // 如果消息添加失败，返回错误
        if (!messageAdded) {
          return { error: '无法添加消息，请先创建新聊天' };
        }
        
        // 重置流式响应
        this.streamingResponse = ''
        
        // 关闭之前的流
        if (this.currentStream) {
          this.currentStream.close()
          this.currentStream = null
        }
        
        // 根据智能体类型选择不同的API
        const agentConfig = this.currentAgentConfig
        
        try {
          if (agentConfig.apiType === 'advanced-agent') {
            // 使用高级智能体API
            return await this.useAdvancedStreamAPI(text, null, agentConfig.systemPrompt)
          } else if (agentConfig.apiType === 'chat') {
            // 使用单一气泡流式输出模式处理Travel Assistant的响应
            console.log('使用单一气泡流式输出模式...')
            
            // 创建一个初始的回复消息
            const initialResponseId = `stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
            const initialMessage = {
              id: initialResponseId,
              role: 'assistant',
              content: '',
              timestamp: new Date().toISOString()
            }
            
            // 添加初始消息
            this.addMessage(initialMessage)
            
            // 发送请求
            try {
              const response = await agentService.postChatStreamRequest(
                text, 
                this.currentChatId,
                agentConfig.systemPrompt || ''
              )
              
              // 检查响应类型
              const contentType = response.headers.get('Content-Type') || ''
              
              if (contentType.includes('text/event-stream')) {
                // 处理流式响应
                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                
                // 处理流数据
                while (true) {
                  const { done, value } = await reader.read()
                  
                  if (done) {
                    break
                  }
                  
                  // 解码数据块
                  const chunk = decoder.decode(value, { stream: true })
                  
                  // 处理SSE格式的数据
                  const lines = chunk.split('\n')
                  for (const line of lines) {
                    if (line.startsWith('event:')) {
                      continue
                    }
                    
                    // 处理SSE数据行
                    if (line.startsWith('data:')) {
                      const data = line.substring(5).trim()
                      
                      // 检查是否结束
                      if (data === '[DONE]') {
                        continue
                      }
                      
                      // 累积到同一消息
                      this.accumulateToMessage(initialResponseId, data)
                    } 
                    // 处理非SSE格式的行
                    else if (line.trim()) {
                      // 累积到同一消息
                      this.accumulateToMessage(initialResponseId, line.trim())
                    }
                  }
                }
              } else {
                // 非流式响应处理
                const text = await response.text()
                
                try {
                  const jsonData = JSON.parse(text)
                  const content = jsonData.content || jsonData.result || jsonData.message || JSON.stringify(jsonData)
                  this.appendToMessage(initialResponseId, content)
                } catch (e) {
                  // 不是JSON，直接添加文本
                  this.appendToMessage(initialResponseId, text)
                }
              }
              
              return true
            } catch (error) {
              console.error('单一气泡模式处理失败:', error)
              this.appendToMessage(initialResponseId, `请求失败: ${error.message}`)
              return false
            }
          } else {
            // 使用标准流式API
            return await this.useStandardStreamAPI(text, null)
          }
        } catch (apiError) {
          console.error('API请求失败:', apiError)
          
          // 添加错误消息
          this.addMessage({
            role: 'assistant',
            content: `请求失败: ${apiError.message}`,
            timestamp: new Date().toISOString(),
            isError: true
          })
          
          return false
        }
      } catch (error) {
        console.error('发送消息失败:', error)
        
        // 添加错误消息
        this.addMessage({
          role: 'assistant',
          content: `发送消息失败: ${error.message}`,
          timestamp: new Date().toISOString(),
          isError: true
        })
        
        return false
      }
    },
    
    // 处理和累积响应数据
    accumulateToMessage(messageId, data) {
      try {
        // 尝试解析JSON
        try {
          const jsonData = JSON.parse(data)
          
          // 尝试获取内容字段
          let content = ''
          if (jsonData.content) {
            content = jsonData.content
          } else if (jsonData.result) {
            content = jsonData.result
          } else if (jsonData.message) {
            content = jsonData.message
          } else if (jsonData.text) {
            content = jsonData.text
          } else if (jsonData.data) {
            const dataContent = jsonData.data
            if (typeof dataContent === 'string') {
              content = dataContent
            } else if (typeof dataContent === 'object' && dataContent !== null) {
              content = dataContent.content || dataContent.result || dataContent.message || JSON.stringify(dataContent)
            }
          } else if (Object.keys(jsonData).length > 0) {
            content = JSON.stringify(jsonData)
          }
          
          if (content) {
            this.appendToMessage(messageId, content)
          }
        } catch (jsonError) {
          // 不是JSON，作为纯文本处理
          if (typeof data === 'string' && data.trim()) {
            // 清理文本
            const cleanText = data.replace(/^["{\s]+|["}:,\s]+$/g, '').trim()
            
            if (cleanText) {
              this.appendToMessage(messageId, cleanText)
            }
          }
        }
      } catch (error) {
        console.error('累积消息处理错误:', error)
      }
    },
    
    // 使用高级流式API
    async useAdvancedStreamAPI(text, placeholderId, systemPrompt) {
      try {
        console.log('使用高级流式API...');
        
        // 获取当前聊天
        const currentChat = this.chatHistory.find(chat => chat.id === this.currentChatId);
        if (!currentChat) return false;
        
        // 找到消息索引
        const msgIndex = currentChat.messages.findIndex(msg => msg.id === placeholderId);
        if (msgIndex !== -1) {
          // 移除占位消息，我们将为每个响应创建新的消息
          currentChat.messages.splice(msgIndex, 1);
        }
        
        try {
          // 发送高级流式请求
          const response = await agentService.postAdvancedStreamRequest(
            text, 
            this.currentChatId,
            systemPrompt || ''
          );
          
          console.log('成功获取到响应，检查响应类型');
          
          // 检查Content-Type来确定如何处理响应
          const contentType = response.headers.get('Content-Type') || '';
          
          // 如果是JSON响应，直接解析
          if (contentType.includes('application/json')) {
            console.log('收到JSON响应');
            const jsonData = await response.json();
            console.log('解析JSON数据:', jsonData);
            
            // 使用JSON数据创建新消息
            let content = '';
            if (jsonData.content) {
              content = jsonData.content;
            } else if (jsonData.result) {
              content = jsonData.result;
            } else if (jsonData.message) {
              content = jsonData.message;
            } else if (jsonData.data) {
              content = typeof jsonData.data === 'string' ? jsonData.data : JSON.stringify(jsonData.data);
            } else {
              content = JSON.stringify(jsonData);
            }
            
            // 添加新的助手消息
            if (content) {
              this.addMessage({
                role: 'assistant',
                content: content,
                timestamp: new Date().toISOString()
              });
            }
            
            return true;
          }
          // 如果是流式响应
          else if (contentType.includes('text/event-stream')) {
            console.log('收到SSE流式响应');
            
            // 处理fetch响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // 用于存储不同类型的消息
            let currentStepMessage = null;
            let currentContentMessage = null;
            
            // 处理流数据
            const processStream = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  
                  if (done) {
                    console.log('流读取完成');
                    break;
                  }
                  
                  // 解码数据
                  const chunk = decoder.decode(value, { stream: true });
                  console.log('收到数据块:', chunk);
                  
                  // 处理SSE格式
                  const lines = chunk.split('\n');
                  for (const line of lines) {
                    // 处理SSE事件行（例如event:step, event:complete等）
                    if (line.startsWith('event:')) {
                      console.log('收到SSE事件行:', line);
                      // 事件行单独处理，但不添加到聊天内容中
                      continue;
                    }
                    // 处理Agent开始执行的消息
                    else if (line.includes("Agent 'liManus' starting execution")) {
                      console.log('收到Agent开始执行消息:', line);
                      
                      // 创建新的Agent开始消息
                      const newAgentMessage = {
                        id: `agent_start_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        role: 'assistant',
                        content: line,
                        timestamp: new Date().toISOString(),
                        isStep: true
                      };
                      this.addMessage(newAgentMessage);
                      continue;
                    }
                    // 处理SSE数据行
                    else if (line.startsWith('data:')) {
                      const data = line.substring(5).trim();
                      
                      // 检查是否结束
                      if (data === '[DONE]') {
                        console.log('流式响应结束');
                        continue;
                      }
                      
                      // 处理数据，为每个数据创建新的消息
                      this.processStreamDataWithNewBubbles(data, currentChat);
                    } 
                    // 处理步骤和智能体信息
                    else if (line.includes('Step ') || line.includes('Agent ')) {
                      console.log('处理步骤或智能体信息:', line);
                      
                      // 创建新的步骤消息
                      const newStepMessage = {
                        id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        role: 'assistant',
                        content: line.trim(),
                        timestamp: new Date().toISOString(),
                        isStep: true
                      };
                      this.addMessage(newStepMessage);
                    }
                    // 处理其他非空行
                    else if (line.trim()) {
                      console.log('处理其他非空行:', line);
                      
                      // 处理数据，为每个数据创建新的消息
                      this.processStreamDataWithNewBubbles(line.trim(), currentChat);
                    }
                  }
                }
              } catch (streamError) {
                console.error('处理流数据错误:', streamError);
                // 创建错误消息
                this.addMessage({
                  role: 'assistant',
                  content: `处理响应时出错: ${streamError.message}`,
                  timestamp: new Date().toISOString(),
                  isError: true
                });
              }
            };
            
            // 开始处理流
            await processStream();
            return true;
          }
          // 其他类型的响应
          else {
            console.log('收到其他类型响应:', contentType);
            
            try {
              // 尝试作为文本处理
              const textContent = await response.text();
              console.log('响应文本内容:', textContent);
              
              // 尝试解析为JSON
              try {
                const parsedData = JSON.parse(textContent);
                console.log('成功解析为JSON:', parsedData);
                
                // 提取内容
                let content = '';
                if (parsedData.content) {
                  content = parsedData.content;
                } else if (parsedData.result) {
                  content = parsedData.result;
                } else if (parsedData.message) {
                  content = parsedData.message;
                } else {
                  content = JSON.stringify(parsedData);
                }
                
                // 添加新消息
                this.addMessage({
                  role: 'assistant',
                  content: content,
                  timestamp: new Date().toISOString()
                });
              } catch (jsonError) {
                // 不是JSON，直接显示文本
                console.log('不是JSON格式，直接使用文本');
                
                // 添加新消息
                this.addMessage({
                  role: 'assistant',
                  content: textContent,
                  timestamp: new Date().toISOString()
                });
              }
            } catch (textError) {
              console.error('读取响应文本失败:', textError);
              // 添加错误消息
              this.addMessage({
                role: 'assistant',
                content: `读取响应失败: ${textError.message}`,
                timestamp: new Date().toISOString(),
                isError: true
              });
            }
            
            return true;
          }
          
        } catch (apiError) {
          console.error('高级流式API处理失败:', apiError);
          // 添加错误消息
          this.addMessage({
            role: 'assistant',
            content: `API请求失败: ${apiError.message}`,
            timestamp: new Date().toISOString(),
            isError: true
          });
          return await this.useStandardStreamAPI(text, null);
        }
        
      } catch (advancedError) {
        console.error('高级流式API失败:', advancedError);
        
        // 添加错误消息
        this.addMessage({
          role: 'assistant',
          content: `请求失败: ${advancedError.message}`,
          timestamp: new Date().toISOString(),
          isError: true
        });
        
        // 尝试使用普通流式API
        return await this.useStandardStreamAPI(text, null);
      }
    },
    
    // 处理流数据并创建新的聊天气泡
    processStreamDataWithNewBubbles(data, currentChat) {
      try {
        // 处理特殊的SSE事件
        if (data.startsWith('event:')) {
          console.log('收到SSE事件:', data);
          // 我们只显示步骤内容，不显示事件指令
          return;
        }
        
        // 处理Agent开始执行的消息
        if (data.includes("Agent 'liManus' starting execution")) {
          console.log('收到Agent开始执行消息:', data);
          
          // 创建新的Agent开始消息
          const newAgentMessage = {
            id: `agent_start_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: 'assistant',
            content: data,
            timestamp: new Date().toISOString(),
            isStep: true
          };
          this.addMessage(newAgentMessage);
          return;
        }
        
        // 如果是特殊的命令，如智能体步骤说明
        if (data.startsWith('Step ') || data.startsWith('Agent ')) {
          console.log('收到步骤或智能体指令:', data);
          
          // 创建新的步骤消息，而不是更新现有的
          const newStepMessage = {
            id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: 'assistant',
            content: data,
            timestamp: new Date().toISOString(),
            isStep: true
          };
          this.addMessage(newStepMessage);
          return;
        }
        
        // 处理可能包含特殊字符的情况
        if (data.includes('event:') || data.includes('step') || data.includes('complete') || data.includes('Agent')) {
          console.log('收到带特殊标记的数据:', data);
          
          // 提取有用的信息（去除event:前缀等）
          const cleanedData = data
            .replace(/event:(step|complete|start|end)/gi, '')
            .replace(/^[",\s]+|[",\s]+$/g, '')
            .trim();
          
          if (cleanedData) {
            console.log('清理后的数据:', cleanedData);
            
            // 创建新的步骤消息，而不是更新现有的
            const newStepMessage = {
              id: `step_info_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              role: 'assistant',
              content: cleanedData,
              timestamp: new Date().toISOString(),
              isStep: true
            };
            this.addMessage(newStepMessage);
          }
          return;
        }
        
        // 尝试解析JSON
        try {
          const jsonData = JSON.parse(data);
          
          // 尝试不同的字段名称获取内容
          let newContent = '';
          
          // 检查常见字段名
          if (jsonData.content) {
            newContent = jsonData.content;
          } else if (jsonData.result) {
            newContent = jsonData.result;
          } else if (jsonData.message) {
            newContent = jsonData.message;
          } else if (jsonData.text) {
            newContent = jsonData.text;
          } else if (jsonData.data) {
            // 如果有data字段，尝试获取其中的内容
            const dataContent = jsonData.data;
            if (typeof dataContent === 'string') {
              newContent = dataContent;
            } else if (typeof dataContent === 'object' && dataContent !== null) {
              // 尝试从data对象中获取内容
              newContent = dataContent.content || dataContent.result || dataContent.message || dataContent.text || JSON.stringify(dataContent);
            }
          } else if (Object.keys(jsonData).length > 0) {
            // 如果没有找到预期字段但有其他字段，序列化整个对象
            newContent = JSON.stringify(jsonData);
          }
          
          if (newContent) {
            console.log('解析到JSON内容:', newContent);
            
            // 创建新的内容消息
            const newContentMessage = {
              id: `content_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              role: 'assistant',
              content: newContent,
              timestamp: new Date().toISOString()
            };
            this.addMessage(newContentMessage);
          }
        } catch (jsonError) {
          // 不是有效的JSON，作为纯文本处理
          console.log('非JSON数据，作为文本处理:', data);
          
          // 尝试修复无效的JSON字符串 - 处理不以引号闭合的情况
          if (data.startsWith('"') && !data.endsWith('"')) {
            const fixedData = data + '"';
            try {
              const jsonData = JSON.parse(fixedData);
              const content = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData);
              
              // 创建新的内容消息
              const newContentMessage = {
                id: `content_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                role: 'assistant',
                content: content,
                timestamp: new Date().toISOString()
              };
              this.addMessage(newContentMessage);
              return;
            } catch (e) {
              // 修复失败，继续作为文本处理
            }
          }
          
          // 检查常见的语法错误模式并修复或忽略
          if (data.includes('SyntaxError: Unexpected token') || data.includes('SyntaxError: Unexpected end of JSON input')) {
            console.log('忽略语法错误消息');
            return;
          }
          
          // 其他情况则作为纯文本处理
          if (typeof data === 'string' && data.trim()) {
            // 去除可能的JSON格式前后缀，如引号、大括号等
            const cleanedText = data
              .replace(/^["{\s]+|["}:,\s]+$/g, '')
              .trim();
              
            if (cleanedText) {
              // 创建新的内容消息
              const newContentMessage = {
                id: `text_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                role: 'assistant',
                content: cleanedText,
                timestamp: new Date().toISOString()
              };
              this.addMessage(newContentMessage);
            }
          }
        }
      } catch (e) {
        console.error('处理数据错误:', e, data);
        
        // 处理任何类型的错误，尝试直接使用文本
        if (typeof data === 'string' && data.trim()) {
          const cleanedText = data
            .replace(/^["{\s]+|["}:,\s]+$/g, '')
            .trim();
            
          if (cleanedText) {
            // 创建新的内容消息
            const newContentMessage = {
              id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              role: 'assistant',
              content: cleanedText,
              timestamp: new Date().toISOString()
            };
            this.addMessage(newContentMessage);
          }
        }
      }
    },
    
    // 使用标准流式API（作为备选）
    async useStandardStreamAPI(text, placeholderId) {
      try {
        // 获取当前聊天
        const currentChat = this.chatHistory.find(chat => chat.id === this.currentChatId)
        if (!currentChat) return false
        
        // 如果有占位符，移除它（我们会创建新的消息）
        if (placeholderId) {
          const msgIndex = currentChat.messages.findIndex(msg => msg.id === placeholderId)
          if (msgIndex !== -1) {
            currentChat.messages.splice(msgIndex, 1)
          }
        }
        
        // 用于存储不同类型的消息
        let currentStepMessage = null
        let currentContentMessage = null
        
        // 重置流式响应缓冲区
        this.streamingResponse = ''
        
        // 根据当前选择的智能体类型决定使用哪个API
        const agentConfig = this.currentAgentConfig
        let streamUrl = ''
        
        if (agentConfig.apiType === 'agent') {
          streamUrl = agentService.getTaskStreamUrl(text)
        } else if (agentConfig.apiType === 'chat') {
          streamUrl = chatService.getChatStreamUrl(text, this.currentChatId)
        }
        
        console.log('使用标准流式API URL:', streamUrl)
        
        // 尝试使用EventSource
        let useEventSource = true
        
        // 检查浏览器是否支持EventSource
        if (typeof EventSource === 'undefined') {
          console.warn('浏览器不支持EventSource，将使用备选方法')
          useEventSource = false
        }
        
        if (useEventSource) {
          console.log('创建EventSource连接...')
          
          // 设置EventSource选项
          const eventSourceInit = {
            withCredentials: true // 允许跨域请求发送cookie
          }
          
          // 创建EventSource
          const eventSource = new EventSource(streamUrl, eventSourceInit)
          this.currentStream = eventSource
          
          // 连接打开时的处理
          eventSource.onopen = (event) => {
            console.log('EventSource连接已打开', event)
          }
          
          // 收到消息时的处理
          eventSource.onmessage = (event) => {
            console.log('收到SSE消息:', event.data)
            
            // 检查是否结束标记
            if (event.data === '[DONE]') {
              console.log('流式响应结束')
              eventSource.close()
              this.currentStream = null
              return
            }
            
            // 处理Agent开始执行的消息
            if (event.data.includes("Agent 'liManus' starting execution")) {
              console.log('收到Agent开始执行消息:', event.data);
              
              // 创建新的Agent开始消息
              const newAgentMessage = {
                id: `agent_start_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                role: 'assistant',
                content: event.data,
                timestamp: new Date().toISOString(),
                isStep: true
              };
              this.addMessage(newAgentMessage);
              return;
            }
            
            // 处理特殊的SSE格式内容
            if (event.data.startsWith('event:')) {
              console.log('收到SSE事件:', event.data)
              return
            }
            
            // 处理步骤和智能体信息
            if (event.data.startsWith('Step ') || event.data.startsWith('Agent ')) {
              console.log('收到步骤或智能体信息:', event.data)
              
              // 创建新的步骤消息
              const newStepMessage = {
                id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                role: 'assistant',
                content: event.data,
                timestamp: new Date().toISOString(),
                isStep: true
              };
              this.addMessage(newStepMessage);
              return
            }
            
            // 处理收到的数据
            let newContent = ''
            
            try {
              // 尝试解析JSON
              const jsonData = JSON.parse(event.data)
              if (typeof jsonData === 'object' && jsonData !== null) {
                // 提取内容字段
                newContent = jsonData.content || jsonData.result || jsonData.message || ''
                
                // 如果没有找到预期字段，尝试序列化整个对象
                if (!newContent && Object.keys(jsonData).length > 0) {
                  newContent = JSON.stringify(jsonData)
                }
              } else {
                newContent = String(jsonData)
              }
            } catch (e) {
              // 不是JSON，直接使用文本
              console.log('非JSON数据，直接使用文本:', event.data)
              newContent = event.data
            }
            
            // 创建新的内容消息
            if (newContent) {
              const newContentMessage = {
                id: `content_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                role: 'assistant',
                content: newContent,
                timestamp: new Date().toISOString()
              };
              this.addMessage(newContentMessage);
            }
          }
          
          // 错误处理
          eventSource.onerror = async (error) => {
            console.error('EventSource错误:', error)
            
            // 关闭连接
            eventSource.close()
            this.currentStream = null
            
            // 添加错误消息
            this.addMessage({
              role: 'assistant',
              content: '连接中断，请重试',
              timestamp: new Date().toISOString(),
              isError: true
            })
          }
          
          return true
        } else {
          // 直接使用备选方法
          await this.fallbackToSyncAPI(text)
          return true
        }
      } catch (streamError) {
        console.error('创建或处理标准流式API时出错:', streamError)
        // 使用同步API作为后备
        await this.fallbackToSyncAPI(text)
        return true
      }
    },
    
    // 当流式API失败时的备选方案
    async fallbackToSyncAPI(text) {
      try {
        console.log('使用同步API作为备选...')
        this.isLoading = true
        
        // 获取当前聊天
        const currentChat = this.chatHistory.find(chat => chat.id === this.currentChatId)
        if (!currentChat) {
          this.isLoading = false
          return false
        }
        
        // 根据当前选择的智能体类型决定使用哪个API
        const agentConfig = this.currentAgentConfig
        let response = null
        
        if (agentConfig.apiType === 'advanced-agent') {
          // 构建高级请求
          const request = agentService.buildAdvancedRequest(
            text, 
            this.currentChatId,
            agentConfig.systemPrompt || ''
          )
          
          // 执行高级任务
          response = await agentService.executeAdvancedTask(request)
        } else if (agentConfig.apiType === 'agent') {
          // 执行普通任务
          response = await agentService.executeTask(text)
        } else {
          // 默认使用聊天API
          response = await chatService.getChat(text, this.currentChatId)
        }
        
        console.log('同步API响应:', response)
        
        // 提取内容
        let content = ''
        if (response.content) {
          content = response.content
        } else if (response.result) {
          content = response.result
        } else if (response.message) {
          content = response.message
        } else {
          content = JSON.stringify(response)
        }
        
        // 添加助手消息
        this.addMessage({
          role: 'assistant',
          content: content,
          timestamp: new Date().toISOString()
        })
        
        this.isLoading = false
        return true
      } catch (error) {
        console.error('同步API失败:', error)
        
        // 添加错误消息
        this.addMessage({
          role: 'assistant',
          content: `请求失败: ${error.message}`,
          timestamp: new Date().toISOString(),
          isError: true
        })
        
        this.isLoading = false
        return false
      }
    },
    
    // 同步方式发送消息（备用方法）
    async sendMessageSync(text) {
      if (!text.trim()) return false
      
      try {
        // 确保有当前聊天
        if (!this.currentChatId) {
          this.createNewChat()
        }
        
        // 添加用户消息
        this.addMessage({
          role: 'user',
          content: text,
          timestamp: new Date().toISOString()
        })
        
        this.isLoading = true
        
        // 根据当前选择的智能体类型决定使用哪个API
        const agentConfig = this.currentAgentConfig
        let response = ''
        
        if (agentConfig.apiType === 'agent') {
          const result = await agentService.executeTask(text)
          response = result.result || '无响应'
        } else if (agentConfig.apiType === 'chat') {
          response = await chatService.getChat(text, this.currentChatId)
        }
        
        // 添加AI响应
        this.addMessage({
          role: 'assistant',
          content: response,
          timestamp: new Date().toISOString()
        })
        
        this.isLoading = false
        return true
      } catch (error) {
        console.error('发送消息失败:', error)
        this.isLoading = false
        return false
      }
    },
    
    // 新增方法：在一个气泡中累积流式响应
    processStreamDataCombined(data, currentChat, lastMessageId) {
      try {
        // 如果没有最后消息ID，创建一个新消息
        if (!lastMessageId) {
          // 创建新消息
          const newMessage = {
            id: `stream_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString()
          };
          
          // 添加新消息
          this.addMessage(newMessage);
          return newMessage.id;
        }
        
        // 处理特殊的SSE事件或指令，这些不累积到内容中
        if (
          data.startsWith('event:') || 
          data.includes("Agent 'liManus' starting execution") ||
          data.startsWith('Step ') || 
          data.startsWith('Agent ')
        ) {
          // 直接跳过特殊事件
          return lastMessageId;
        }
        
        // 尝试解析JSON
        try {
          const jsonData = JSON.parse(data);
          
          // 尝试不同的字段名称获取内容
          let newContent = '';
          
          // 检查常见字段名
          if (jsonData.content) {
            newContent = jsonData.content;
          } else if (jsonData.result) {
            newContent = jsonData.result;
          } else if (jsonData.message) {
            newContent = jsonData.message;
          } else if (jsonData.text) {
            newContent = jsonData.text;
          } else if (jsonData.data) {
            const dataContent = jsonData.data;
            if (typeof dataContent === 'string') {
              newContent = dataContent;
            } else if (typeof dataContent === 'object' && dataContent !== null) {
              newContent = dataContent.content || dataContent.result || dataContent.message || dataContent.text || JSON.stringify(dataContent);
            }
          } else if (Object.keys(jsonData).length > 0) {
            newContent = JSON.stringify(jsonData);
          }
          
          if (newContent) {
            this.appendToMessage(lastMessageId, newContent);
          }
        } catch (jsonError) {
          // 不是有效的JSON，作为纯文本处理
          if (typeof data === 'string' && data.trim()) {
            // 去除可能的JSON格式前后缀，如引号、大括号等
            const cleanedText = data
              .replace(/^["{\s]+|["}:,\s]+$/g, '')
              .trim();
              
            if (cleanedText) {
              this.appendToMessage(lastMessageId, cleanedText);
            }
          }
        }
        
        return lastMessageId;
      } catch (e) {
        console.error('处理流式数据错误:', e);
        return lastMessageId;
      }
    },
    
    // 向现有消息追加内容
    appendToMessage(messageId, content) {
      // 找到当前聊天
      const currentChat = this.chatHistory.find(chat => chat.id === this.currentChatId);
      if (!currentChat) return;
      
      // 查找指定消息
      const message = currentChat.messages.find(msg => msg.id === messageId);
      if (!message) return;
      
      // 追加内容，添加适当的空格分隔
      if (message.content && !message.content.endsWith(' ')) {
        message.content += ' ';
      }
      message.content += content;
      
      // 更新最后修改时间
      message.timestamp = new Date().toISOString();
      
      // 保存到本地存储
      this.saveToLocalStorage();
    },
    
    // 修改流式API以支持单气泡模式
    async useStreamingAPI(text, agentType) {
      try {
        // 重置流式响应
        this.streamingResponse = '';
        
        // 确定是否使用单一气泡模式
        const useSingleBubble = agentType === 'chat';
        let lastMessageId = null;
        
        // 获取当前聊天
        const currentChat = this.chatHistory.find(chat => chat.id === this.currentChatId);
        if (!currentChat) return false;
        
        // 使用基础流式API
        const response = await agentService.postChatStreamRequest(text, this.currentChatId);
        
        // 检查Content-Type确定如何处理响应
        const contentType = response.headers.get('Content-Type') || '';
        
        // 处理流式响应
        if (contentType.includes('text/event-stream')) {
          // 处理fetch响应
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          
          // 处理流数据
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              console.log('流读取完成');
              break;
            }
            
            // 解码数据
            const chunk = decoder.decode(value, { stream: true });
            
            // 处理SSE格式
            const lines = chunk.split('\n');
            for (const line of lines) {
              // 跳过SSE事件行
              if (line.startsWith('event:')) continue;
              
              // 处理SSE数据行
              if (line.startsWith('data:')) {
                const data = line.substring(5).trim();
                
                // 检查是否结束
                if (data === '[DONE]') {
                  console.log('流式响应结束');
                  continue;
                }
                
                // 根据模式选择处理方法
                if (useSingleBubble) {
                  lastMessageId = this.processStreamDataCombined(data, currentChat, lastMessageId);
                } else {
                  this.processStreamDataWithNewBubbles(data, currentChat);
                }
              }
              // 处理普通行数据（非SSE格式）
              else if (line.trim()) {
                if (useSingleBubble) {
                  lastMessageId = this.processStreamDataCombined(line.trim(), currentChat, lastMessageId);
                } else {
                  this.processStreamDataWithNewBubbles(line.trim(), currentChat);
                }
              }
            }
          }
          return true;
        } 
        // 处理其他类型的响应
        else {
          try {
            const textContent = await response.text();
            
            // 尝试解析JSON
            try {
              const jsonData = JSON.parse(textContent);
              let content = jsonData.content || jsonData.result || jsonData.message || JSON.stringify(jsonData);
              
              // 根据模式选择处理方法
              if (useSingleBubble) {
                const newMessage = {
                  role: 'assistant',
                  content: content,
                  timestamp: new Date().toISOString()
                };
                this.addMessage(newMessage);
              } else {
                this.addMessage({
                  role: 'assistant',
                  content: content,
                  timestamp: new Date().toISOString()
                });
              }
            } catch (jsonError) {
              // 不是JSON，直接显示文本
              const newMessage = {
                role: 'assistant',
                content: textContent,
                timestamp: new Date().toISOString()
              };
              this.addMessage(newMessage);
            }
          } catch (textError) {
            console.error('读取响应文本失败:', textError);
            this.addMessage({
              role: 'assistant',
              content: `读取响应失败: ${textError.message}`,
              timestamp: new Date().toISOString(),
              isError: true
            });
          }
          return true;
        }
      } catch (error) {
        console.error('流式API处理失败:', error);
        this.addMessage({
          role: 'assistant',
          content: `请求失败: ${error.message}`,
          timestamp: new Date().toISOString(),
          isError: true
        });
        return false;
      }
    },
  }
}) 