import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    cors: {
      origin: '*', // 允许所有来源
      credentials: true, // 允许携带凭证
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
        ws: true, // 支持WebSocket
        rewrite: (path) => path,
        headers: {
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache'
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.log('代理错误', err);
            
            // 如果是SSE请求，返回一个特殊的错误消息
            if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
              res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
              });
              res.write('data: {"error": "代理服务器错误"}\n\n');
              res.write('data: [DONE]\n\n');
              res.end();
            } else {
              // 普通请求，返回JSON错误
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({ error: '代理服务器错误', message: err.message }));
              }
            }
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('发送请求到:', req.url, '方法:', req.method);
            
            // 保持长连接
            proxyReq.setHeader('Connection', 'keep-alive');
            
            // 如果是EventSource请求，设置适当的头部
            if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
              proxyReq.setHeader('Cache-Control', 'no-cache');
              proxyReq.setHeader('Content-Type', 'text/event-stream');
            }
            
            // 不要手动处理POST body，让http-proxy自动处理
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('收到响应:', proxyRes.statusCode, req.url, '方法:', req.method);
            
            // 处理SSE响应
            if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
              proxyRes.headers['Connection'] = 'keep-alive';
              proxyRes.headers['Cache-Control'] = 'no-cache';
              proxyRes.headers['Content-Type'] = 'text/event-stream';
              
              // 确保不会被压缩
              delete proxyRes.headers['content-encoding'];
              
              // 如果后端返回500错误但是SSE请求，尝试转换为正常响应
              if (proxyRes.statusCode >= 500) {
                console.log('后端服务器错误，但是SSE请求，尝试恢复...');
                res.writeHead(200, {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  'Connection': 'keep-alive'
                });
                res.write('data: {"error": "后端服务器错误"}\n\n');
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }
            }
            
            // 添加CORS头
            if (!res.headersSent) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
              res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
          });
        },
      }
    }
  },
})
