import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'home',
          redirect: '/chat'
        },
        {
          path: 'chat',
          name: 'chat',
          component: () => import('../views/ChatView.vue'),
          meta: { 
            title: '智能对话',
            description: '与智能AI助手进行对话，获取旅游建议和信息服务',
            keywords: '智能对话,AI助手,旅游助手,聊天'
          }
        },
        {
          path: 'knowledge',
          name: 'knowledge',
          component: () => import('../views/KnowledgeView.vue'),
          meta: { 
            title: '知识库',
            description: '管理和查询AI助手的知识库资源',
            keywords: '知识库,文档管理,AI资源,上传文档'
          }
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../views/SettingsView.vue'),
          meta: { 
            title: '设置',
            description: '配置AI助手的各项参数和个人偏好',
            keywords: '设置,配置,个人偏好,API设置'
          }
        }
      ]
    },
    // 404页面
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

export default router 