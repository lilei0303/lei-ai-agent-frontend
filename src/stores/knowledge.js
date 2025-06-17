import { defineStore } from 'pinia'
import axios from 'axios'

export const useKnowledgeStore = defineStore('knowledge', {
  state: () => ({
    documents: [],
    isLoading: false,
    error: null
  }),
  
  actions: {
    // Load documents
    async loadDocuments() {
      this.isLoading = true
      this.error = null
      
      try {
        // Mock data - in real app, connect to your API
        // const response = await axios.get('/api/knowledge')
        
        // Mock data
        this.documents = [
          { 
            id: 'doc1', 
            name: 'Travel Guide 2023.pdf', 
            description: 'Comprehensive travel guide with popular destinations',
            type: 'pdf',
            size: 1458000,
            uploadDate: '2023-06-10T08:30:00.000Z'
          },
          { 
            id: 'doc2', 
            name: 'Company Handbook.docx', 
            description: 'Internal company policies and procedures',
            type: 'docx',
            size: 2540000,
            uploadDate: '2023-06-15T14:20:00.000Z'
          },
          {
            id: 'doc3',
            name: 'Project Notes.txt',
            description: 'Meeting notes from project kickoff',
            type: 'txt',
            size: 45000,
            uploadDate: '2023-07-01T09:15:00.000Z'
          }
        ]
        
        this.isLoading = false
        return this.documents
      } catch (error) {
        console.error('Error loading documents:', error)
        this.error = 'Failed to load documents'
        this.isLoading = false
        throw error
      }
    },
    
    // Upload document (mock)
    async uploadDocument(file) {
      this.isLoading = true
      this.error = null
      
      try {
        // Mock upload - in real app, use FormData and axios to upload
        console.log(`Uploading ${file.name}`)
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        // Create mock document
        const newDoc = {
          id: 'doc' + Date.now(),
          name: file.name,
          description: '',
          type: file.name.split('.').pop().toLowerCase(),
          size: file.size,
          uploadDate: new Date().toISOString()
        }
        
        this.documents.push(newDoc)
        this.isLoading = false
        return newDoc
      } catch (error) {
        console.error('Error uploading document:', error)
        this.error = 'Failed to upload document'
        this.isLoading = false
        throw error
      }
    },
    
    // Delete document
    async deleteDocument(documentId) {
      this.isLoading = true
      this.error = null
      
      try {
        // Mock delete - in real app, connect to your API
        // await axios.delete(`/api/knowledge/documents/${documentId}`)
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Remove from local state
        const index = this.documents.findIndex(doc => doc.id === documentId)
        if (index !== -1) {
          this.documents.splice(index, 1)
        }
        
        this.isLoading = false
        return true
      } catch (error) {
        console.error('Error deleting document:', error)
        this.error = 'Failed to delete document'
        this.isLoading = false
        throw error
      }
    }
  }
}) 