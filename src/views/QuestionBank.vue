<template>
  <div class="question-bank">
    <div class="page-header">
      <h1>题库管理</h1>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="loadStats">🔄 刷新</button>
        <button class="btn btn-primary" @click="exportQuestions">📤 导出题库</button>
      </div>
    </div>

    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📚</div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.total_questions || 0 }}</div>
          <div class="stat-label">总题数</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon">🕒</div>
        <div class="stat-info">
          <div class="stat-value">{{ formatDate(stats.last_updated) }}</div>
          <div class="stat-label">最后更新</div>
        </div>
      </div>
    </div>

    <div class="search-section">
      <div class="search-box">
        <input type="text" v-model="searchQuery" placeholder="搜索题目..." class="search-input" />
        <button class="btn btn-primary" @click="search">搜索</button>
      </div>
    </div>

    <div class="questions-table">
      <div class="table-header">
        <div class="table-row">
          <div class="table-cell">ID</div>
          <div class="table-cell">题目</div>
          <div class="table-cell">答案</div>
          <div class="table-cell">来源</div>
          <div class="table-cell">操作</div>
        </div>
      </div>

      <div class="table-body">
        <div v-for="question in filteredQuestions" :key="question.id" class="table-row">
          <div class="table-cell">{{ question.id }}</div>
          <div class="table-cell question-text">{{ question.text }}</div>
          <div class="table-cell">{{ question.answer }}</div>
          <div class="table-cell">{{ question.source }}</div>
          <div class="table-cell">
            <button class="btn btn-small btn-danger" @click="deleteQuestion(question.id)">
              删除
            </button>
          </div>
        </div>

        <div v-if="filteredQuestions.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-text">暂无题目数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { questionBankService } from '@/services/api'

interface Question {
  id: string | number
  text: string
  answer: string
  source: string
}

interface Stats {
  total_questions: number
  last_updated: string
}

const stats = ref<Stats>({
  total_questions: 0,
  last_updated: '',
})

const questions = ref<Question[]>([])
const searchQuery = ref('')

let baseURL = ''

const initAPI = async () => {
  await questionBankService.init()
}

const loadStats = async () => {
  try {
    const s = await questionBankService.getStats()
    if (s) stats.value = s
  } catch (error) {
  }
}

const loadQuestions = async () => {
  const list = await questionBankService.getQuestions()
  questions.value = list
}

const exportQuestions = async () => {
  const data = await questionBankService.exportQuestions()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'question_bank_export.json'
  a.click()
  URL.revokeObjectURL(url)
}

const deleteQuestion = async (id: string | number) => {
  if (!confirm('确定要删除这道题目吗？')) return
  const res = await questionBankService.deleteQuestion(typeof id === 'string' ? id : id)
  if (res.success) {
    questions.value = questions.value.filter((q) => q.id !== id)
    await loadStats()
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return '暂无'
  return new Date(dateString).toLocaleString('zh-CN')
}

const filteredQuestions = computed(() => {
  return questions.value
})

const search = async () => {
  if (!searchQuery.value) {
    await loadQuestions()
    return
    }
  const result = await questionBankService.searchQuestions(searchQuery.value)
  questions.value = result
}

onMounted(async () => {
  await initAPI()
  await loadStats()
  await loadQuestions()
})
</script>

<style scoped>
.question-bank {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  color: #2c3e50;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 32px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
}

.stat-label {
  color: #7f8c8d;
  font-size: 14px;
}

.search-section {
  margin-bottom: 20px;
}

.search-box {
  display: flex;
  gap: 10px;
  max-width: 400px;
}

.search-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #bdc3c7;
  border-radius: 4px;
  font-size: 14px;
}

.questions-table {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.table-header {
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.table-row {
  display: grid;
  grid-template-columns: 80px 1fr 200px 120px 100px;
  border-bottom: 1px solid #ecf0f1;
}

.table-cell {
  padding: 12px 16px;
  display: flex;
  align-items: center;
}

.table-header .table-cell {
  font-weight: 600;
  color: #2c3e50;
}

.table-body .table-row:hover {
  background: #f8f9fa;
}

.question-text {
  word-break: break-word;
  line-height: 1.4;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #7f8c8d;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
</style>
