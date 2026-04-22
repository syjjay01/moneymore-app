<template>
  <view class="page">
    <view v-if="budgetStore.isOverBudget" class="warning-banner">
      本月支出已超预算 ¥{{ formatAmount(budgetStore.overBudgetAmount) }}
    </view>

    <view class="top-card">
      <view class="month-row">
        <text class="arrow" @click="changeMonth(-1)">‹</text>
        <picker
          mode="date"
          fields="month"
          :value="`${selectedMonth}-01`"
          @change="handleMonthPick"
          class="month-picker"
        >
          <view class="month-center">
            <text class="month-label">{{ monthLabel }}</text>
            <text class="month-tip">点击可切换月份</text>
          </view>
        </picker>
        <text class="arrow" @click="changeMonth(1)">›</text>
      </view>

      <button v-if="!isCurrentMonth" class="back-btn" size="mini" @click="backToCurrentMonth">回到当月</button>
    </view>

    <view class="tab-row">
      <view
        v-for="item in tabs"
        :key="item.value"
        class="tab-item"
        :class="{ active: activeTab === item.value }"
        @click="activeTab = item.value"
      >
        {{ item.label }}
      </view>
    </view>

    <view v-if="activeTab === 'daily'" class="card">
      <view class="card-head">
        <text class="card-title">日常支出</text>
        <button class="mini-primary" size="mini" @click="openNewFlow">新流水</button>
      </view>

      <view v-if="contextLabel" class="context-line">
        <text>{{ contextLabel }}</text>
        <text class="context-clear" @click="clearContextFilter">清除</text>
      </view>

      <scroll-view class="day-scroll" scroll-x>
        <view class="day-list">
          <view
            v-for="day in monthDays"
            :key="day.date"
            class="day-chip"
            :class="{ active: selectedDay === day.date }"
            @click="selectedDay = day.date"
          >
            {{ day.label }}
          </view>
        </view>
      </scroll-view>

      <view v-if="dailyRecords.length" class="flow-list">
        <view v-for="item in dailyRecords" :key="item.id" class="flow-item">
          <view class="flow-main">
            <text class="flow-content">{{ item.content }}</text>
            <text class="flow-tag">{{ item.tagName }}</text>
          </view>
          <text class="flow-amount">￥{{ formatAmount(item.amount) }}</text>
        </view>
      </view>
      <view v-else class="empty-box">当天还没有流水，点“新流水”记一笔。</view>
    </view>

    <view v-if="activeTab === 'fixed'" class="card">
      <view class="card-head">
        <text class="card-title">固定支出区块</text>
        <text class="manage-link" @click="goToManagePage('/pages/fixed-expense/fixed-expense-management')">管理固定支出</text>
      </view>

      <view v-if="fixedExpenseItems.length">
        <view v-for="item in fixedExpenseItems" :key="item.id" class="row-item">
          <text class="row-name">{{ item.name }}</text>
          <view class="amount-box">
            <text class="currency">￥</text>
            <input
              v-model="fixedExpenseAmounts[item.id]"
              class="amount-input"
              type="digit"
              @focus="handleAmountFocus(fixedExpenseAmounts, item.id)"
              @blur="handleAmountBlur(fixedExpenseAmounts, item.id)"
            />
          </view>
        </view>
      </view>
      <view v-else class="empty-box">暂无固定支出项。</view>

      <button class="primary-btn" @click="saveFixedExpenseRecords">保存固定支出</button>
    </view>

    <view v-if="activeTab === 'income'" class="card">
      <view class="card-head">
        <text class="card-title">收入区块</text>
        <text class="manage-link" @click="goToManagePage('/pages/income/income-management')">管理收入项</text>
      </view>

      <view v-if="incomeItems.length">
        <view v-for="item in incomeItems" :key="item.id" class="row-item">
          <text class="row-name">{{ item.name }}</text>
          <view class="amount-box">
            <text class="currency">￥</text>
            <input
              v-model="incomeAmounts[item.id]"
              class="amount-input"
              type="digit"
              @focus="handleAmountFocus(incomeAmounts, item.id)"
              @blur="handleAmountBlur(incomeAmounts, item.id)"
            />
          </view>
        </view>
      </view>
      <view v-else class="empty-box">暂无收入项。</view>

      <button class="primary-btn" @click="saveIncomeRecords">保存收入</button>
    </view>

    <view v-if="newFlow.visible" class="sheet-mask" @click="closeNewFlow">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">新增流水</text>
          <text class="sheet-close" @click="closeNewFlow">×</text>
        </view>

        <view class="field">
          <text class="field-label">内容</text>
          <input v-model="newFlow.content" class="field-input" placeholder="例如：今天吃饭" maxlength="40" />
        </view>

        <view class="field">
          <text class="field-label">金额</text>
          <view class="field-amount-row">
            <view class="amount-box flex-1">
              <text class="currency">￥</text>
              <input
                v-model="newFlow.amount"
                class="amount-input"
                type="digit"
                @focus="handleFlowAmountFocus"
                @blur="handleFlowAmountBlur"
              />
            </view>
            <button class="voice-btn" :class="{ recording: isRecognizing }" @click="toggleVoiceRecognition">
              {{ isRecognizing ? "停止" : "语音" }}
            </button>
          </view>
        </view>

        <view class="field">
          <text class="field-label">标签</text>
          <scroll-view class="tag-scroll" scroll-x>
            <view class="tag-list">
              <view
                v-for="tag in expenseTags"
                :key="tag.id"
                class="tag-chip"
                :class="{ active: newFlow.tagId === tag.id }"
                @click="newFlow.tagId = tag.id"
              >
                {{ tag.name }}
              </view>
            </view>
          </scroll-view>
        </view>

        <button class="primary-btn" @click="saveNewFlow">保存</button>
      </view>
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
  getStorageSync,
  removeStorageSync,
  saveUserTransaction,
  upsertMonthlyTransaction
} from "../../utils/storage"

const budgetStore = useBudgetStore()
const RECORD_FILTER_CACHE_KEY = "MM_RECORD_FILTER_CACHE"

const tabs = [
  { label: "日常支出区块", value: "daily" },
  { label: "固定支出区块", value: "fixed" },
  { label: "收入区块", value: "income" }
]

const currentUser = ref("")
const activeTab = ref("daily")
const selectedMonth = ref(getCurrentMonth())
const selectedDay = ref(getCurrentDate())
const contextLabel = ref("")
const contextTagId = ref("")

const incomeItems = ref([])
const fixedExpenseItems = ref([])
const expenseTags = ref([])
const transactions = ref([])
const incomeAmounts = reactive({})
const fixedExpenseAmounts = reactive({})

const newFlow = reactive({
  visible: false,
  content: "",
  amount: "0",
  tagId: ""
})

const isRecognizing = ref(false)
const recognitionSupported = ref(false)
let recognition = null

const monthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split("-")
  return `${year}年${Number(month)}月`
})

const isCurrentMonth = computed(() => selectedMonth.value === getCurrentMonth())

const monthDays = computed(() => {
  const [year, month] = selectedMonth.value.split("-").map(Number)
  const total = new Date(year, month, 0).getDate()
  return Array.from({ length: total }, (_, index) => {
    const day = String(index + 1).padStart(2, "0")
    const date = `${selectedMonth.value}-${day}`
    return {
      date,
      label: `${index + 1}日`
    }
  })
})

const expenseTagMap = computed(() => {
  return expenseTags.value.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
})

const dailyRecords = computed(() => {
  return transactions.value
    .filter((item) => {
      if (item.type !== "expense") {
        return false
      }
      if (!item.tagId) {
        return false
      }
      if (item.date !== selectedDay.value) {
        return false
      }
      if (contextTagId.value && item.tagId !== contextTagId.value) {
        return false
      }
      return true
    })
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))
    .map((item) => ({
      id: item.id,
      content: item.note || expenseTagMap.value[item.tagId]?.name || "日常支出",
      amount: Number(item.amount || 0),
      tagName: expenseTagMap.value[item.tagId]?.name || "未分类"
    }))
})

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function getCurrentDate() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

function formatAmount(value) {
  return Number(value || 0).toFixed(2)
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function normalizeAmount(value) {
  const amount = Number(value)
  if (Number.isNaN(amount) || amount <= 0) {
    return null
  }
  return Number(amount.toFixed(2))
}

function getLatestMonthlyAmount({ type, keyName, keyValue }) {
  const matched = transactions.value
    .filter((item) => {
      if (!item || item.type !== type) {
        return false
      }
      if (item[keyName] !== keyValue) {
        return false
      }
      return String(item.date || "").slice(0, 7) === selectedMonth.value
    })
    .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))

  return matched[0]?.amount || 0
}

function syncAmountInputs() {
  incomeItems.value.forEach((item) => {
    const value = getLatestMonthlyAmount({
      type: "income",
      keyName: "incomeItemId",
      keyValue: item.id
    })
    incomeAmounts[item.id] = String(value || 0)
  })

  fixedExpenseItems.value.forEach((item) => {
    const value = getLatestMonthlyAmount({
      type: "expense",
      keyName: "fixedExpenseItemId",
      keyValue: item.id
    })
    fixedExpenseAmounts[item.id] = String(value || 0)
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

  if (!newFlow.tagId && expenseTags.value.length) {
    newFlow.tagId = expenseTags.value[0].id
  }

  syncAmountInputs()
}

function updateSelectedDayForMonth() {
  const today = getCurrentDate()
  const isSameMonth = String(today).slice(0, 7) === selectedMonth.value
  const day = isSameMonth ? today.slice(8, 10) : "01"
  selectedDay.value = `${selectedMonth.value}-${day}`
}

function changeMonth(offset) {
  const [year, month] = selectedMonth.value.split("-").map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  selectedMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
  updateSelectedDayForMonth()
  syncAmountInputs()
}

function backToCurrentMonth() {
  selectedMonth.value = getCurrentMonth()
  selectedDay.value = getCurrentDate()
  syncAmountInputs()
}

function handleMonthPick(event) {
  const monthValue = String(event.detail.value || "").slice(0, 7)
  if (!monthValue) {
    return
  }
  selectedMonth.value = monthValue
  updateSelectedDayForMonth()
  syncAmountInputs()
}

function applyRecordFilter() {
  const cached = getStorageSync(RECORD_FILTER_CACHE_KEY)
  if (!cached) {
    return
  }

  removeStorageSync(RECORD_FILTER_CACHE_KEY)

  if (cached.month) {
    selectedMonth.value = cached.month
    updateSelectedDayForMonth()
  }

  if (cached.day) {
    selectedDay.value = cached.day
  }

  if (cached.tagId) {
    contextTagId.value = cached.tagId
    contextLabel.value = `${monthLabel.value} · ${cached.tagName || "标签筛选"}`
    activeTab.value = "daily"
  } else {
    contextTagId.value = ""
    contextLabel.value = ""
  }

  if (cached.fixedExpenseItemId) {
    activeTab.value = "fixed"
    contextLabel.value = `${monthLabel.value} · ${cached.fixedExpenseName || "固定支出"}`
  }

  syncAmountInputs()
}

function clearContextFilter() {
  contextTagId.value = ""
  contextLabel.value = ""
}

function goToManagePage(url) {
  uni.navigateTo({ url })
}

function handleAmountFocus(target, key) {
  if (String(target[key]) === "0") {
    target[key] = ""
  }
}

function handleAmountBlur(target, key) {
  if (String(target[key] || "").trim() === "") {
    target[key] = "0"
  }
}

function handleFlowAmountFocus() {
  if (String(newFlow.amount) === "0") {
    newFlow.amount = ""
  }
}

function handleFlowAmountBlur() {
  if (String(newFlow.amount || "").trim() === "") {
    newFlow.amount = "0"
  }
}

function saveIncomeRecords() {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  const targetDate = `${selectedMonth.value}-01`
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
        date: targetDate,
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

  const saved = validRecords.every((record) => upsertMonthlyTransaction(currentUser.value, record, "incomeItemId"))
  if (!saved) {
    showToast("保存收入失败")
    return
  }

  loadUserData()
  budgetStore.refreshBudget()
  uni.showToast({ title: "收入已保存", icon: "success" })
}

function saveFixedExpenseRecords() {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  const targetDate = `${selectedMonth.value}-01`
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
        date: targetDate,
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

  const saved = validRecords.every((record) => upsertMonthlyTransaction(currentUser.value, record, "fixedExpenseItemId"))
  if (!saved) {
    showToast("保存固定支出失败")
    return
  }

  loadUserData()
  budgetStore.refreshBudget()
  uni.showToast({ title: "固定支出已保存", icon: "success" })
}

function openNewFlow() {
  newFlow.visible = true
  newFlow.content = ""
  newFlow.amount = "0"
  newFlow.tagId = newFlow.tagId || expenseTags.value[0]?.id || ""
}

function closeNewFlow() {
  stopVoiceRecognition()
  newFlow.visible = false
}

function saveNewFlow() {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  const amount = normalizeAmount(newFlow.amount)
  if (!amount) {
    showToast("请输入大于0的金额")
    return
  }

  if (!newFlow.tagId) {
    showToast("请选择标签")
    return
  }

  const content = String(newFlow.content || "").trim()
  if (!content) {
    showToast("请输入内容")
    return
  }

  const saved = saveUserTransaction(currentUser.value, {
    id: createId("expense"),
    type: "expense",
    amount,
    tagId: newFlow.tagId,
    note: content,
    date: selectedDay.value,
    createdAt: Date.now()
  })

  if (!saved) {
    showToast("保存流水失败")
    return
  }

  loadUserData()
  budgetStore.refreshBudget()
  closeNewFlow()
  uni.showToast({
    title: "流水已新增",
    icon: "success"
  })
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

  newFlow.content = text
  if (amount) {
    newFlow.amount = amount
  }
  if (matchedTagId) {
    newFlow.tagId = matchedTagId
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

onShow(() => {
  loadUserData()
  budgetStore.refreshBudget()
  setupSpeechRecognition()
  applyRecordFilter()

  if (!selectedDay.value.startsWith(selectedMonth.value)) {
    updateSelectedDayForMonth()
  }
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
    radial-gradient(circle at 15% 8%, rgba(27, 119, 83, 0.25), transparent 30%),
    linear-gradient(170deg, #f3fcf7 0%, #eef6ff 46%, #f8fafc 100%);
}

.warning-banner {
  margin-bottom: 18rpx;
  padding: 16rpx 20rpx;
  border-radius: 16rpx;
  background: #fde9e7;
  color: #c0392b;
  font-weight: 600;
}

.top-card,
.card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  border-radius: 26rpx;
  box-shadow: 0 20rpx 46rpx rgba(24, 45, 66, 0.08);
}

.top-card {
  position: relative;
  padding: 22rpx 24rpx;
}

.month-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.arrow {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  text-align: center;
  line-height: 56rpx;
  font-size: 40rpx;
  color: #1f7a4d;
  background: #e7f3ec;
}

.month-center {
  flex: 1;
  text-align: center;
}

.month-picker {
  flex: 1;
}

.month-label {
  font-size: 40rpx;
  font-weight: 700;
  color: #16324a;
}

.month-tip {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #6f8191;
}

.back-btn {
  margin-top: 14rpx;
  border-radius: 999rpx;
  background: #1f7a4d;
  color: #fff;
}

.tab-row {
  margin-top: 18rpx;
  display: flex;
  gap: 12rpx;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 16rpx 8rpx;
  border-radius: 16rpx;
  background: #eaf1f8;
  color: #6b7c8d;
  font-size: 26rpx;
}

.tab-item.active {
  background: #1f7a4d;
  color: #fff;
  font-weight: 600;
}

.card {
  margin-top: 18rpx;
  padding: 24rpx;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #16324a;
}

.manage-link {
  color: #1f7a4d;
  font-size: 24rpx;
}

.mini-primary {
  margin: 0;
  border-radius: 999rpx;
  background: #1f7a4d;
  color: #fff;
}

.context-line {
  margin-top: 14rpx;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: #eef7f2;
  color: #3c556b;
  font-size: 24rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.context-clear {
  color: #1f7a4d;
}

.day-scroll {
  margin-top: 14rpx;
  white-space: nowrap;
}

.day-list {
  display: inline-flex;
  gap: 10rpx;
  padding-bottom: 6rpx;
}

.day-chip {
  min-width: 92rpx;
  text-align: center;
  padding: 10rpx 12rpx;
  border-radius: 999rpx;
  background: #eef2f7;
  color: #607284;
  font-size: 24rpx;
}

.day-chip.active {
  background: #16324a;
  color: #fff;
}

.flow-list {
  margin-top: 16rpx;
}

.flow-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18rpx 0;
  border-bottom: 1rpx solid rgba(22, 50, 74, 0.08);
}

.flow-item:last-child {
  border-bottom: none;
}

.flow-content {
  font-size: 28rpx;
  color: #162d40;
}

.flow-tag {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #7690a5;
}

.flow-amount {
  font-size: 30rpx;
  color: #d64541;
  font-weight: 700;
}

.row-item {
  margin-top: 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.row-name {
  font-size: 28rpx;
  color: #162d40;
  flex: 1;
}

.amount-box {
  width: 240rpx;
  height: 76rpx;
  border-radius: 14rpx;
  background: #f5f8fc;
  border: 1rpx solid rgba(22, 50, 74, 0.1);
  display: flex;
  align-items: center;
  padding: 0 14rpx;
  box-sizing: border-box;
}

.flex-1 {
  flex: 1;
  width: auto;
}

.currency {
  color: #607284;
  font-size: 26rpx;
  margin-right: 6rpx;
}

.amount-input {
  flex: 1;
  font-size: 30rpx;
  color: #162d40;
}

.primary-btn {
  margin-top: 22rpx;
  border-radius: 14rpx;
  background: #1f7a4d;
  color: #fff;
  font-size: 28rpx;
}

.empty-box {
  margin-top: 16rpx;
  padding: 20rpx;
  border-radius: 14rpx;
  background: #f5f8fc;
  color: #74879a;
  font-size: 24rpx;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(11, 19, 32, 0.35);
  display: flex;
  align-items: flex-end;
  z-index: 40;
}

.sheet {
  width: 100%;
  padding: 24rpx;
  border-radius: 24rpx 24rpx 0 0;
  background: #fff;
}

.sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #162d40;
}

.sheet-close {
  font-size: 44rpx;
  color: #8093a7;
}

.field {
  margin-top: 18rpx;
}

.field-label {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  color: #63788c;
}

.field-input {
  height: 76rpx;
  border-radius: 14rpx;
  padding: 0 16rpx;
  background: #f5f8fc;
  border: 1rpx solid rgba(22, 50, 74, 0.1);
  font-size: 28rpx;
  color: #162d40;
}

.field-amount-row {
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.voice-btn {
  margin: 0;
  width: 128rpx;
  height: 76rpx;
  line-height: 76rpx;
  border-radius: 14rpx;
  background: #eaf2ff;
  color: #2c6ad7;
  font-size: 24rpx;
}

.voice-btn.recording {
  background: #fde9e7;
  color: #c0392b;
}

.tag-scroll {
  white-space: nowrap;
}

.tag-list {
  display: inline-flex;
  gap: 10rpx;
}

.tag-chip {
  padding: 10rpx 16rpx;
  border-radius: 999rpx;
  background: #eef2f7;
  color: #617286;
  font-size: 24rpx;
}

.tag-chip.active {
  background: #1f7a4d;
  color: #fff;
}
</style>
