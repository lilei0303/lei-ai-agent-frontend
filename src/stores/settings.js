import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: localStorage.getItem('theme') || 'light',
    apiConfig: JSON.parse(localStorage.getItem('apiConfig') || 
      JSON.stringify({
        baseUrl: '/api',
        timeout: 30000,
        maxTokens: 2048,
        temperature: 0.7,
      })
    ),
  }),
  
  actions: {
    setTheme(theme) {
      this.theme = theme
      localStorage.setItem('theme', theme)
      // Apply theme to document body
      document.body.className = `theme-${theme}`
    },
    
    updateApiConfig(config) {
      this.apiConfig = { ...this.apiConfig, ...config }
      localStorage.setItem('apiConfig', JSON.stringify(this.apiConfig))
    },
    
    initializeTheme() {
      // Apply saved theme on app startup
      document.body.className = `theme-${this.theme}`
    },

    // Additional methods for the SettingsView component
    async getSettings() {
      // In a real app, this would fetch from an API
      return {
        api: {
          endpoint: this.apiConfig.baseUrl,
          apiKey: '******',
          model: 'gpt-4',
          temperature: this.apiConfig.temperature
        },
        app: {
          theme: this.theme,
          language: 'en',
          enableNotifications: true,
          enableSounds: true,
          messageDisplay: 'modern',
          fontSize: 14
        }
      }
    },

    async updateSettings(settings) {
      // Update API config
      if (settings.api) {
        this.updateApiConfig({
          baseUrl: settings.api.endpoint,
          temperature: settings.api.temperature
        })
      }
      
      // Update theme
      if (settings.app && settings.app.theme) {
        this.setTheme(settings.app.theme)
      }
      
      // In a real app, this would save to an API
      return true
    }
  }
}) 