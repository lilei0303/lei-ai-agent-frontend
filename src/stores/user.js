import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: {
      id: 1,
      username: 'guest',
      displayName: '访客用户',
      email: 'guest@example.com',
      avatar: '/default-avatar.png',
      role: 'user'
    }
  }),
  
  actions: {

    // 更新用户资料
    async updateProfile(profileData) {
      try {
        // 更新本地用户数据
        this.user = { ...this.user, ...profileData }
        return true
      } catch (error) {
        console.error('更新用户资料失败:', error)
        return false
      }
    },
    
    // 修改密码 - 保留此方法以便将来实现真实的身份验证
    async changePassword(currentPassword, newPassword) {
      try {
        console.log('密码修改功能在无登录模式下不可用')
        return true
      } catch (error) {
        console.error('修改密码失败:', error)
        return false
      }
    }
  }
})