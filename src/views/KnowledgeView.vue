<template>
  <div class="knowledge-container">
    <div class="knowledge-header">
      <h2>知识库</h2>
      <div class="header-actions">
        <el-button type="primary" @click="showUploadDialog">
          <el-icon><Upload /></el-icon>
          上传文档
        </el-button>
      </div>
    </div>

    <div class="knowledge-content">
      <!-- Search and filter -->
      <div class="search-container">
        <el-input
          v-model="searchQuery"
          placeholder="搜索知识库..."
          clearable
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        
        <el-select v-model="filterType" placeholder="按类型筛选" clearable class="filter-select">
          <el-option label="全部类型" value="" />
          <el-option label="PDF" value="pdf" />
          <el-option label="文本" value="txt" />
          <el-option label="Word" value="docx" />
        </el-select>
      </div>

      <!-- Knowledge list -->
      <div class="knowledge-list">
        <el-empty v-if="filteredDocuments.length === 0" description="未找到文档" />
        
        <el-card v-for="doc in filteredDocuments" :key="doc.id" class="knowledge-item">
          <div class="knowledge-item-header">
            <div class="doc-icon" :class="doc.type">
              <el-icon v-if="doc.type === 'pdf'"><Document /></el-icon>
              <el-icon v-else-if="doc.type === 'txt'"><Memo /></el-icon>
              <el-icon v-else><Files /></el-icon>
            </div>
            <div class="doc-info">
              <h3>{{ doc.name }}</h3>
              <div class="doc-meta">
                <span class="doc-size">{{ formatFileSize(doc.size) }}</span>
                <span class="doc-date">{{ formatDate(doc.uploadDate) }}</span>
              </div>
            </div>
          </div>
          
          <div class="knowledge-item-actions">
            <el-tooltip content="查看文档" placement="top">
              <el-button type="primary" link @click="viewDocument(doc)">
                <el-icon><View /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="删除文档" placement="top">
              <el-button type="danger" link @click="confirmDelete(doc)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </el-card>
      </div>
    </div>

    <!-- Upload dialog -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传文档"
      width="500px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-upload
        class="upload-area"
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        :file-list="fileList"
        :limit="1"
      >
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">
          拖拽文件到此处或 <em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持的格式: PDF, TXT, DOCX 等 (最大: 10MB)
          </div>
        </template>
      </el-upload>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="uploadDocument" :disabled="!selectedFile">
            上传
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  Document, 
  Delete, 
  Upload, 
  View, 
  Search, 
  Files, 
  Memo, 
  UploadFilled 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useKnowledgeStore } from '@/stores/knowledge'

const knowledgeStore = useKnowledgeStore()
const searchQuery = ref('')
const filterType = ref('')
const uploadDialogVisible = ref(false)
const fileList = ref([])
const selectedFile = ref(null)

// Load knowledge base data
onMounted(async () => {
  try {
    await knowledgeStore.loadDocuments()
  } catch (error) {
    console.error('Failed to load knowledge base:', error)
    ElMessage.error('加载知识库失败')
  }
})

// Filter documents based on search and type filter
const filteredDocuments = computed(() => {
  let docs = knowledgeStore.documents
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    docs = docs.filter(doc => 
      doc.name.toLowerCase().includes(query) || 
      doc.description?.toLowerCase().includes(query)
    )
  }
  
  // Apply type filter
  if (filterType.value) {
    docs = docs.filter(doc => doc.type === filterType.value)
  }
  
  return docs
})

// Format file size
const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

// Format date
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}

// Show upload dialog
const showUploadDialog = () => {
  uploadDialogVisible.value = true
  fileList.value = []
  selectedFile.value = null
}

// Handle file selection
const handleFileChange = (file) => {
  selectedFile.value = file.raw
  fileList.value = [file]
}

// Upload document
const uploadDocument = async () => {
  if (!selectedFile.value) return
  
  try {
    await knowledgeStore.uploadDocument(selectedFile.value)
    ElMessage.success('文档上传成功')
    uploadDialogVisible.value = false
  } catch (error) {
    console.error('Failed to upload document:', error)
    ElMessage.error('上传文档失败')
  }
}

// View document
const viewDocument = (doc) => {
  ElMessage.info(`查看文档: ${doc.name} (功能未实现)`)
}

// Delete document
const confirmDelete = (doc) => {
  ElMessageBox.confirm(
    `确定要删除 "${doc.name}" 吗？`,
    '删除文档',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
    .then(async () => {
      try {
        await knowledgeStore.deleteDocument(doc.id)
        ElMessage.success('文档删除成功')
      } catch (error) {
        console.error('Failed to delete document:', error)
        ElMessage.error('删除文档失败')
      }
    })
    .catch(() => {
      // User cancelled
    })
}
</script>

<style scoped>
.knowledge-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.knowledge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  border-bottom: 1px solid var(--border-color);
  background-color: white;
}

.knowledge-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.knowledge-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: var(--bg-color);
}

.search-container {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.search-input {
  flex-grow: 1;
}

.filter-select {
  width: 140px;
}

.knowledge-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.knowledge-item {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s, box-shadow 0.2s;
}

.knowledge-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}

.knowledge-item-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-icon {
  font-size: 24px;
  color: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background-color: rgba(64, 158, 255, 0.1);
}

.doc-icon.pdf {
  color: #E74C3C;
  background-color: rgba(231, 76, 60, 0.1);
}

.doc-icon.txt {
  color: #3498DB;
  background-color: rgba(52, 152, 219, 0.1);
}

.doc-icon.docx {
  color: #2980B9;
  background-color: rgba(41, 128, 185, 0.1);
}

.doc-info {
  flex: 1;
}

.doc-info h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-meta {
  display: flex;
  gap: 12px;
  color: var(--text-color-light);
  font-size: 12px;
}

.doc-size, .doc-date {
  display: flex;
  align-items: center;
}

.knowledge-item-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
  opacity: 0;
  transition: opacity 0.2s;
}

.knowledge-item:hover .knowledge-item-actions {
  opacity: 1;
}

.upload-area {
  width: 100%;
}

/* 响应式样式 */
@media (max-width: 768px) {
  .knowledge-header {
    padding: 0 16px;
    height: 56px;
  }
  
  .knowledge-content {
    padding: 16px;
  }
  
  .search-container {
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .knowledge-list {
    grid-template-columns: 1fr;
  }
  
  .knowledge-item-actions {
    opacity: 1;
  }
}

@media (max-width: 480px) {
  .knowledge-header h2 {
    font-size: 16px;
  }
  
  .knowledge-content {
    padding: 12px;
  }
}
</style>
