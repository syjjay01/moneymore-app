<template>
  <view class="page">
    <view v-if="budgetStore.isOverBudget" class="warning-banner">
      本月支出已超预算 ¥{{ formatAmount(budgetStore.overBudgetAmount) }}
    </view>

    <view class="hero-card">
      <text class="hero-kicker">本月记账</text>
      <text class="hero-title">{{ currentMonthLabel }}</text>
      <text class="hero-desc">收入和固定支出默认回显本月上次录入值，日常支出按条追加保存。</text>
    </view>

    <view class="section-card">
      <view class="section-head">
        <view>
          <text class="section-title">收入区块</text>
          <text class="section-desc">录入本月各项收入金额</text>
        </view>
        <text class="manage-link" @click="goToManagePage('/pages/manage/income-items')">管理收入项</text>
      </view>

      <view v-if="incomeItems.length" class="item-list">
        <view v-for="item in incomeItems" :key="item.id" class="amount-row">
          <text class="item-name">{{ item.name }}</text>
          <input
            v-model="incomeAmounts[item.id]"
            class="amount-input"
            type="digit"
            placeholder="0"
          />
        </view>
      </view>
      <view v-else class="empty-state">暂无收入项，请先配置收入项。</view>

      <button class="primary-btn" @click="saveIncomeRecords">保存收入</button>
    </view>

    <view class="section-card">
      <view class="section-head">
        <view>
          <text class="section-title">固定支出区块</text>
          <text class="section-desc">录入本月固定支出金额</text>
        </view>
        <text class="manage-link" @click="goToManagePage('/pages/manage/fixed-expense-items')">管理固定支出</text>
      </view>

      <view v-if="fixedExpenseItems.length" class="item-list">
        <view v-for="item in fixedExpenseItems" :key="item.id" class="amount-row">
          <text class="item-name">{{ item.name }}</text>
          <input
            v-model="fixedExpenseAmounts[item.id]"
            class="amount-input"
            type="digit"
            placeholder="0"
          />
        </view>
      </view>
      <view v-else class="empty-state">暂无固定支出项，请先配置固定支出项。</view>

      <button class="primary-btn" @click="saveFixedExpenseRecords">保存固定支出</button>
    </view>

    <view class="section-card">
      <view class="section-head">
        <view>
          <text class="section-title">日常支出区块</text>
          <text class="section-desc">记录一笔即时开销，支持语音识别金额与标签（H5）</text>
        </view>
      </view>

      <view class="field">
        <text class="label">金额</text>
        <view class="amount-with-voice">
          <input
            v-model="expenseForm.amount"
            class="input amount-flex"
            type="digit"
            placeholder="请输入支出金额"
          />
          <button
            class="voice-btn"
            :class="{ recording: isRecognizing }"
            @click="toggleVoiceRecognition"
          >
            {{ isRecognizing ? "停止" : "麦克风" }}
          </button>
        </view>
      </view>

      <view class="field">
        <text class="label">标签</text>
        <picker :range="tagNames" :value="selectedTagIndex" @change="handleTagChange">
          <view class="picker-value">
            {{ selectedTagName || "请选择支出标签" }}
          </view>
        </picker>
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea
          v-model="expenseForm.note"
          class="textarea"
          maxlength="100"
          placeholder="可选，记录本次开销说明"
        />
      </view>

      <button class="primary-btn" @click="saveDailyExpense">保存日常支出</button>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from "vue"
import { onHide, onShow } from "@dcloudio/uni-app"
import { useBudgetStore } from "../../stores/budget"
import {
  getCurrentUser,
  getCurrentUserData,
  saveUserTransaction,
  upsertMonthlyTransaction
} from "../../utils/storage"

const budgetStore = useBudgetStore()
const currentUser = ref("")
const incomeItems = ref([])
const fixedExpenseItems = ref([])
const expenseTags = ref([])
const transactions = ref([])
const incomeAmounts = reactive({})
const fixedExpenseAmounts = reactive({})
const expenseForm = reactive({
  amount: "",
  tagId: "",
  note: ""
})
const isRecognizing = ref(false)
const recognitionSupported = ref(false)
let recognition = null

const currentDate = computed(() => formatDate(new Date()))
const currentMonthLabel = computed(() => {
  const now = new Date()
  return `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月`
})
const tagNames = computed(() => expenseTags.value.map((item) => item.name))
const selectedTagIndex = computed(() => {
  const index = expenseTags.value.findIndex((item) => item.id === expenseForm.tagId)
  return index > -1 ? index : 0
})
const selectedTagName = computed(() => {
  return expenseTags.value.find((item) => item.id === expenseForm.tagId)?.name || ""
})

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatAmount(value) {
  return Number(value || 0).toFixed(2)
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function getMonthKey(date) {
  return String(date || "").slice(0, 7)
}

function getLatestMonthlyAmount({ type, keyName, keyValue }) {
  const currentMonth = getMonthKey(currentDate.value)
  const matched = transactions.value
    .filter((item) => {
      if (!item || item.type !== type) {
        return false
      }

      if (item[keyName] !== keyValue) {
        return false
      }

      return getMonthKey(item.date) === currentMonth
    })
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))

  return matched[0]?.amount || 0
}

function syncAmountInputs() {
  incomeItems.value.forEach((item) => {
    incomeAmounts[item.id] = String(getLatestMonthlyAmount({
      type: "income",
      keyName: "incomeItemId",
      keyValue: item.id
    }) || 0)
  })

  fixedExpenseItems.value.forEach((item) => {
    fixedExpenseAmounts[item.id] = String(getLatestMonthlyAmount({
      type: "expense",
      keyName: "fixedExpenseItemId",
      keyValue: item.id
    }) || 0)
  })
}

function loadUserData() {
  currentUser.value = getCurrentUser() || ""
  if (!currentUser.value) {
    uni.reLaunch({
      url: "/pages/login/login"
    })
    return
  }

  const userData = getCurrentUserData()
  if (!userData) {
    showToast("未找到当前用户数据")
    return
  }

  incomeItems.value = userData.incomeItems || userData.income_items || []
  fixedExpenseItems.value = userData.fixedExpenseItems || userData.fixed_expense_items || []
  expenseTags.value = userData.expenseTags || userData.expense_tags || []
  transactions.value = userData.transactions || []

  if (!expenseForm.tagId && expenseTags.value.length) {
    expenseForm.tagId = expenseTags.value[0].id
  }

  syncAmountInputs()
}

function normalizeAmount(value) {
  const amount = Number(value)
  if (Number.isNaN(amount) || amount < 0) {
    return null
  }

  return Number(amount.toFixed(2))
}

function saveIncomeRecords() {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  const records = incomeItems.value
    .map((item) => {
      const amount = normalizeAmount(incomeAmounts[item.id])
      if (amount === null) {
        return {
          invalid: true,
          name: item.name
        }
      }

      if (!amount) {
        return null
      }

      return {
        id: createId("income"),
        type: "income",
        amount,
        incomeItemId: item.id,
        note: "",
        date: currentDate.value,
        createdAt: Date.now()
      }
    })
    .filter(Boolean)

  const invalidRecord = records.find((item) => item.invalid)
  if (invalidRecord) {
    showToast(`${invalidRecord.name} 金额格式不正确`)
    return
  }

  const validRecords = records.filter((item) => !item.invalid)
  if (!validRecords.length) {
    showToast("请至少填写一项大于0的收入")
    return
  }

  const saved = validRecords.every((record) =>
    upsertMonthlyTransaction(currentUser.value, record, "incomeItemId")
  )

  if (!saved) {
    showToast("保存收入失败")
    return
  }

  loadUserData()
  budgetStore.refreshBudget()
  uni.showToast({
    title: "收入已保存",
    icon: "success"
  })
}

function saveFixedExpenseRecords() {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  const records = fixedExpenseItems.value
    .map((item) => {
      const amount = normalizeAmount(fixedExpenseAmounts[item.id])
      if (amount === null) {
        return {
          invalid: true,
          name: item.name
        }
      }

      if (!amount) {
        return null
      }

      return {
        id: createId("fixed_expense"),
        type: "expense",
        amount,
        fixedExpenseItemId: item.id,
        note: "",
        date: currentDate.value,
        createdAt: Date.now()
      }
    })
    .filter(Boolean)

  const invalidRecord = records.find((item) => item.invalid)
  if (invalidRecord) {
    showToast(`${invalidRecord.name} 金额格式不正确`)
    return
  }

  const validRecords = records.filter((item) => !item.invalid)
  if (!validRecords.length) {
    showToast("请至少填写一项大于0的固定支出")
    return
  }

  const saved = validRecords.every((record) =>
    upsertMonthlyTransaction(currentUser.value, record, "fixedExpenseItemId")
  )

  if (!saved) {
    showToast("保存固定支出失败")
    return
  }

  loadUserData()
  budgetStore.refreshBudget()
  uni.showToast({
    title: "固定支出已保存",
    icon: "success"
  })
}

function handleTagChange(event) {
  const index = Number(event.detail.value)
  expenseForm.tagId = expenseTags.value[index]?.id || ""
}

function resetExpenseForm() {
  expenseForm.amount = ""
  expenseForm.note = ""
  expenseForm.tagId = expenseTags.value[0]?.id || ""
}

function setupSpeechRecognition() {
  if (typeof window === "undefined") {
    recognitionSupported.value = false
    return
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    recognitionSupported.value = false
    return
  }

  recognitionSupported.value = true
  recognition = new SpeechRecognition()
  recognition.lang = "zh-CN"
  recognition.interimResults = false
  recognition.continuous = false

  recognition.onresult = (event) => {
    const text = String(event.results?.[0]?.[0]?.transcript || "").trim()
    if (!text) {
      showToast("无法识别，请手动输入")
      return
    }
    applySpeechText(text)
  }

  recognition.onerror = () => {
    showToast("无法识别，请手动输入")
  }

  recognition.onend = () => {
    isRecognizing.value = false
  }
}

function extractAmount(text) {
  const amountMatch = text.match(/(\d+(?:\.\d+)?)/)
  if (!amountMatch) {
    return null
  }
  return amountMatch[1]
}

function matchTagIdByText(text) {
  const loweredText = text.toLowerCase()
  const matchedTag = expenseTags.value.find((item) => loweredText.includes(String(item.name || "").toLowerCase()))
  return matchedTag?.id || ""
}

function applySpeechText(text) {
  const amount = extractAmount(text)
  const matchedTagId = matchTagIdByText(text)

  if (!amount && !matchedTagId) {
    showToast("无法识别，请手动输入")
    return
  }

  if (amount) {
    expenseForm.amount = amount
  }
  if (matchedTagId) {
    expenseForm.tagId = matchedTagId
  }

  showToast("语音识别成功")
}

async function ensureMicrophonePermission() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return true
  } catch (error) {
    showToast("麦克风权限被拒绝")
    return false
  }
}

function stopVoiceRecognition() {
  if (recognition && isRecognizing.value) {
    recognition.stop()
  }
  isRecognizing.value = false
}

async function startVoiceRecognition() {
  if (!recognitionSupported.value || !recognition) {
    showToast("当前环境不支持语音识别")
    return
  }

  const granted = await ensureMicrophonePermission()
  if (!granted) {
    return
  }

  try {
    recognition.start()
    isRecognizing.value = true
  } catch (error) {
    showToast("无法识别，请手动输入")
    isRecognizing.value = false
  }
}

async function toggleVoiceRecognition() {
  if (isRecognizing.value) {
    stopVoiceRecognition()
    return
  }

  await startVoiceRecognition()
}

function saveDailyExpense() {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  const amount = normalizeAmount(expenseForm.amount)
  if (!amount) {
    showToast("请输入大于0的支出金额")
    return
  }

  if (!expenseForm.tagId) {
    showToast("请选择支出标签")
    return
  }

  const saved = saveUserTransaction(currentUser.value, {
    id: createId("expense"),
    type: "expense",
    amount,
    tagId: expenseForm.tagId,
    note: expenseForm.note.trim(),
    date: currentDate.value,
    createdAt: Date.now()
  })

  if (!saved) {
    showToast("保存日常支出失败")
    return
  }

  resetExpenseForm()
  loadUserData()
  budgetStore.refreshBudget()
  uni.showToast({
    title: "日常支出已保存",
    icon: "success"
  })
}

function goToManagePage(url) {
  uni.navigateTo({
    url
  })
}

onShow(() => {
  loadUserData()
  budgetStore.refreshBudget()
  setupSpeechRecognition()
})

onHide(() => {
  stopVoiceRecognition()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background:
    radial-gradient(circle at top left, rgba(43, 122, 75, 0.14), transparent 28%),
    linear-gradient(180deg, #f3f8f4 0%, #f8f9fa 34%, #f8f9fa 100%);
}

.warning-banner {
  margin-bottom: 20rpx;
  padding: 20rpx 24rpx;
  border-radius: 22rpx;
  background: #fdeceb;
  color: var(--color-danger);
  font-size: 28rpx;
  font-weight: 600;
}

.hero-card,
.section-card {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20rpx 50rpx rgba(31, 41, 51, 0.08);
}

.hero-card {
  padding: 32rpx 28rpx;
}

.hero-kicker {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(43, 122, 75, 0.1);
  color: var(--color-primary);
  font-size: 24rpx;
  letter-spacing: 2rpx;
}

.hero-title {
  display: block;
  margin-top: 18rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-desc {
  display: block;
  margin-top: 14rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
  line-height: 1.7;
}

.section-card {
  margin-top: 24rpx;
  padding: 28rpx;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20rpx;
}

.section-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.manage-link {
  padding-top: 8rpx;
  font-size: 24rpx;
  color: var(--color-primary);
}

.amount-with-voice {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.amount-flex {
  flex: 1;
}

.voice-btn {
  margin: 0;
  padding: 0 20rpx;
  min-width: 140rpx;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 18rpx;
  background: rgba(43, 122, 75, 0.1);
  color: var(--color-primary);
  font-size: 24rpx;
  box-sizing: border-box;
}

.voice-btn.recording {
  background: #fdeceb;
  color: var(--color-danger);
}

.item-list {
  margin-top: 24rpx;
}

.amount-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.amount-row + .amount-row {
  margin-top: 18rpx;
}

.item-name {
  flex: 1;
  font-size: 30rpx;
  color: var(--text-primary);
}

.amount-input,
.input,
.picker-value,
.textarea {
  border: 2rpx solid rgba(43, 122, 75, 0.14);
  background: #fff;
  color: var(--text-primary);
}

.amount-input,
.input,
.picker-value {
  height: 84rpx;
  padding: 0 22rpx;
  border-radius: 18rpx;
  font-size: 28rpx;
}

.amount-input {
  width: 240rpx;
  text-align: right;
}

.field {
  margin-top: 24rpx;
}

.label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.picker-value {
  display: flex;
  align-items: center;
}

.textarea {
  width: 100%;
  min-height: 180rpx;
  padding: 20rpx 22rpx;
  border-radius: 18rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.primary-btn {
  margin-top: 28rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  background: var(--color-primary);
  color: #fff;
}

.empty-state {
  margin-top: 24rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: #f7faf8;
  color: var(--text-secondary);
  font-size: 26rpx;
}
</style>
