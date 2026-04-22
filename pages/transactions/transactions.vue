<template>
  <view class="page">
    <view v-if="budgetStore.isOverBudget" class="warning-banner">
      本月支出已超预算 ¥{{ formatAmount(budgetStore.overBudgetAmount) }}
    </view>

    <view class="filter-card">
      <view v-if="contextFilter.label" class="context-banner">
        <text class="context-text">来自统计页：{{ contextFilter.label }}</text>
        <text class="context-clear" @click="clearContextFilter">清除</text>
      </view>

      <view class="filter-row">
        <text class="filter-label">类型</text>
        <view class="chip-group">
          <text
            v-for="item in typeOptions"
            :key="item.value"
            class="chip"
            :class="{ active: filters.type === item.value }"
            @click="filters.type = item.value"
          >
            {{ item.label }}
          </text>
        </view>
      </view>

      <view class="filter-row">
        <text class="filter-label">标签</text>
        <picker :range="tagFilterNames" :value="selectedTagPickerIndex" @change="handleTagFilterChange">
          <view class="picker-value" :class="{ disabled: filters.type === 'income' }">
            {{ selectedTagFilterName }}
          </view>
        </picker>
      </view>

      <view class="filter-row">
        <text class="filter-label">时间</text>
        <picker :range="timeFilterOptions" :value="selectedTimeFilterIndex" @change="handleTimeFilterChange">
          <view class="picker-value">{{ filters.time }}</view>
        </picker>
      </view>
    </view>

    <view v-if="groupedTransactions.length" class="list-wrap">
      <view v-for="group in groupedTransactions" :key="group.date" class="group-card">
        <text class="group-title">{{ group.title }}</text>

        <view v-for="item in group.items" :key="item.id" class="swipe-item">
          <view class="swipe-actions">
            <text class="edit-btn" @click="startEdit(item.raw)">编辑</text>
            <text class="delete-btn" @click="handleDelete(item.raw)">删除</text>
          </view>

          <view
            class="transaction-card"
            :style="getSwipeStyle(item.id)"
            @touchstart="handleTouchStart(item.id, $event)"
            @touchmove="handleTouchMove(item.id, $event)"
            @touchend="handleTouchEnd(item.id)"
            @click="closeSwipe(item.id)"
          >
            <view class="item-left">
              <text class="item-icon">{{ item.icon }}</text>
              <view class="item-info">
                <text class="item-name">{{ item.title }}</text>
                <text v-if="item.note" class="item-note">{{ item.note }}</text>
                <text v-else class="item-note muted">无备注</text>
              </view>
            </view>

            <view class="item-right">
              <text class="item-amount" :class="item.amountClass">{{ item.amountText }}</text>
              <text class="item-time">{{ item.timeText }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view v-else class="empty-card">
      <text class="empty-illustration">🧾</text>
      <text class="empty-title">还没有符合条件的流水</text>
      <text class="empty-desc">去记一笔收入或支出，流水会自动出现在这里。</text>
    </view>

    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-label">本月总收入</text>
        <text class="summary-value income">+{{ formatAmount(monthlyTotals.income) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">本月总支出</text>
        <text class="summary-value expense">-{{ formatAmount(monthlyTotals.expense) }}</text>
      </view>
    </view>

    <view v-if="editor.visible" class="modal-mask" @click="closeEditor">
      <view class="modal-card" @click.stop>
        <text class="modal-title">编辑流水</text>

        <view class="field">
          <text class="label">条目</text>
          <view class="readonly-value">{{ editor.sourceName }}</view>
        </view>

        <view class="field">
          <text class="label">金额</text>
          <input v-model="editor.form.amount" class="input" type="digit" placeholder="请输入金额" />
        </view>

        <view v-if="editor.raw?.type === 'expense' && editor.raw?.tagId" class="field">
          <text class="label">标签</text>
          <picker :range="expenseTagNames" :value="editorTagIndex" @change="handleEditorTagChange">
            <view class="picker-value">{{ editorSelectedTagName }}</view>
          </picker>
        </view>

        <view class="field">
          <text class="label">日期</text>
          <picker mode="date" :value="editor.form.date" @change="handleEditorDateChange">
            <view class="picker-value">{{ editor.form.date }}</view>
          </picker>
        </view>

        <view class="field">
          <text class="label">备注</text>
          <textarea
            v-model="editor.form.note"
            class="textarea"
            maxlength="100"
            placeholder="可选，补充备注信息"
          />
        </view>

        <view class="modal-actions">
          <button class="ghost-btn" @click="closeEditor">取消</button>
          <button class="primary-btn" @click="saveEdit">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from "vue"
import { onLoad, onShow } from "@dcloudio/uni-app"
import { useBudgetStore } from "../../stores/budget"
import {
  getCurrentUser,
  getCurrentUserData,
  getStorageSync,
  removeUserTransaction,
  removeStorageSync,
  updateUserTransaction
} from "../../utils/storage"

const budgetStore = useBudgetStore()
const ACTION_WIDTH = 176
const TRANSACTION_FILTER_CACHE_KEY = "MM_TRANSACTION_FILTER_CACHE"
const typeOptions = [
  { label: "全部", value: "all" },
  { label: "支出", value: "expense" },
  { label: "收入", value: "income" }
]
const timeFilterOptions = ["本周", "本月", "自定义"]
const tagEmojiMap = {
  吃饭: "🍜",
  买菜: "🥬",
  娱乐: "🎮",
  零食: "🍪",
  家庭耗材: "🧻",
  衣鞋类: "👟",
  出行类: "🚌"
}

const currentUser = ref("")
const transactions = ref([])
const incomeItems = ref([])
const fixedExpenseItems = ref([])
const expenseTags = ref([])
const selectedMonth = ref("")
const swipeOffsets = reactive({})
const touchState = reactive({})
const filters = reactive({
  type: "all",
  tagId: "",
  time: "本月"
})
const contextFilter = reactive({
  fixedExpenseItemId: "",
  month: "",
  label: ""
})
const editor = reactive({
  visible: false,
  raw: null,
  sourceName: "",
  form: {
    amount: "",
    note: "",
    date: "",
    tagId: ""
  }
})

const incomeMap = computed(() => {
  return incomeItems.value.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
})

const fixedExpenseMap = computed(() => {
  return fixedExpenseItems.value.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
})

const tagMap = computed(() => {
  return expenseTags.value.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
})

const tagFilterNames = computed(() => ["全部标签", ...expenseTags.value.map((item) => item.name)])
const selectedTagPickerIndex = computed(() => {
  if (!filters.tagId) {
    return 0
  }

  const index = expenseTags.value.findIndex((item) => item.id === filters.tagId)
  return index > -1 ? index + 1 : 0
})
const selectedTagFilterName = computed(() => {
  if (filters.type === "income") {
    return "收入不支持标签筛选"
  }

  return tagFilterNames.value[selectedTagPickerIndex.value] || "全部标签"
})
const selectedTimeFilterIndex = computed(() => timeFilterOptions.indexOf(filters.time))
const expenseTagNames = computed(() => expenseTags.value.map((item) => item.name))
const editorTagIndex = computed(() => {
  const index = expenseTags.value.findIndex((item) => item.id === editor.form.tagId)
  return index > -1 ? index : 0
})
const editorSelectedTagName = computed(() => {
  return expenseTags.value.find((item) => item.id === editor.form.tagId)?.name || "请选择标签"
})

const monthTransactions = computed(() => {
  const targetMonth = selectedMonth.value || getCurrentMonth()
  return transactions.value.filter((item) => String(item.date || "").slice(0, 7) === targetMonth)
})

const filteredTransactions = computed(() => {
  return monthTransactions.value
    .filter((item) => {
      if (filters.type !== "all" && item.type !== filters.type) {
        return false
      }

      if (filters.type !== "income" && filters.tagId) {
        return item.tagId === filters.tagId
      }

      if (contextFilter.fixedExpenseItemId) {
        return item.fixedExpenseItemId === contextFilter.fixedExpenseItemId
      }

      return true
    })
    .sort(sortTransactions)
})

const groupedTransactions = computed(() => {
  const groups = []
  const groupMap = {}

  filteredTransactions.value.forEach((item) => {
    const key = item.date
    if (!groupMap[key]) {
      groupMap[key] = {
        date: key,
        title: formatGroupDate(key),
        items: []
      }
      groups.push(groupMap[key])
    }

    groupMap[key].items.push(buildDisplayItem(item))
  })

  return groups
})

const monthlyTotals = computed(() => {
  return monthTransactions.value.reduce(
    (acc, item) => {
      if (item.type === "income") {
        acc.income += Number(item.amount || 0)
      } else {
        acc.expense += Number(item.amount || 0)
      }
      return acc
    },
    { income: 0, expense: 0 }
  )
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

function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey || "").split("-")
  if (!year || !month) {
    return ""
  }
  return `${year}年${Number(month)}月`
}

function formatAmount(value) {
  return Number(value || 0).toFixed(2)
}

function formatGroupDate(date) {
  const [year, month, day] = String(date).split("-")
  return `${year}年${Number(month)}月${Number(day)}日`
}

function formatTime(timestamp) {
  if (!timestamp) {
    return "00:00"
  }

  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function sortTransactions(a, b) {
  const dateDiff = String(b.date || "").localeCompare(String(a.date || ""))
  if (dateDiff !== 0) {
    return dateDiff
  }

  return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
}

function buildDisplayItem(item) {
  const isIncome = item.type === "income"
  const tag = item.tagId ? tagMap.value[item.tagId] : null
  const incomeItem = item.incomeItemId ? incomeMap.value[item.incomeItemId] : null
  const fixedItem = item.fixedExpenseItemId ? fixedExpenseMap.value[item.fixedExpenseItemId] : null

  let title = ""
  let icon = "🧾"

  if (isIncome) {
    title = incomeItem?.name || "收入"
    icon = "💰"
  } else if (tag) {
    title = tag.name
    icon = tagEmojiMap[tag.name] || "🛍️"
  } else {
    title = fixedItem?.name || "固定支出"
    icon = "🏠"
  }

  return {
    id: item.id,
    raw: item,
    title,
    icon,
    note: item.note || "",
    amountText: `${isIncome ? "+" : "-"}${formatAmount(item.amount)}`,
    amountClass: isIncome ? "income" : "expense",
    timeText: formatTime(item.updatedAt || item.createdAt)
  }
}

function normalizeAmount(value) {
  const amount = Number(value)
  if (Number.isNaN(amount) || amount <= 0) {
    return null
  }

  return Number(amount.toFixed(2))
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
  transactions.value = userData?.transactions || []
  incomeItems.value = userData?.incomeItems || []
  fixedExpenseItems.value = userData?.fixedExpenseItems || []
  expenseTags.value = userData?.expenseTags || []
}

function applyRouteFilters(options = {}) {
  selectedMonth.value = options.month || getCurrentMonth()

  if (selectedMonth.value === getCurrentMonth()) {
    filters.time = "本月"
  } else {
    filters.time = "自定义"
  }

  filters.type = options.type || "all"
  filters.tagId = options.tagId || ""
  contextFilter.fixedExpenseItemId = options.fixedExpenseItemId || ""
  contextFilter.month = selectedMonth.value

  const labelParts = []
  if (selectedMonth.value) {
    labelParts.push(formatMonthLabel(selectedMonth.value))
  }
  if (options.tagName) {
    labelParts.push(options.tagName)
  }
  if (options.fixedExpenseName) {
    labelParts.push(options.fixedExpenseName)
  }
  contextFilter.label = labelParts.join(" · ")
}

function applyCachedFilters() {
  const cached = getStorageSync(TRANSACTION_FILTER_CACHE_KEY)
  if (!cached) {
    return
  }

  applyRouteFilters(cached)
  removeStorageSync(TRANSACTION_FILTER_CACHE_KEY)
}

function clearContextFilter() {
  contextFilter.fixedExpenseItemId = ""
  contextFilter.month = ""
  contextFilter.label = ""
  selectedMonth.value = getCurrentMonth()
  filters.type = "all"
  filters.tagId = ""
  filters.time = "本月"
}

function handleTagFilterChange(event) {
  if (filters.type === "income") {
    showToast("收入类型不支持标签筛选")
    return
  }

  const index = Number(event.detail.value)
  filters.tagId = index === 0 ? "" : expenseTags.value[index - 1]?.id || ""
}

function handleTimeFilterChange(event) {
  const selected = timeFilterOptions[Number(event.detail.value)] || "本月"
  if (selected !== "本月") {
    showToast("当前版本先支持本月筛选")
    filters.time = "本月"
    return
  }

  filters.time = selected
}

function getSwipeStyle(id) {
  const offset = swipeOffsets[id] || 0
  return {
    transform: `translateX(-${offset}px)`
  }
}

function handleTouchStart(id, event) {
  const pageX = event.touches?.[0]?.pageX || 0
  touchState[id] = {
    startX: pageX,
    baseOffset: swipeOffsets[id] || 0
  }

  Object.keys(swipeOffsets).forEach((key) => {
    if (key !== id) {
      swipeOffsets[key] = 0
    }
  })
}

function handleTouchMove(id, event) {
  const state = touchState[id]
  if (!state) {
    return
  }

  const currentX = event.touches?.[0]?.pageX || 0
  const deltaX = state.startX - currentX
  const nextOffset = Math.max(0, Math.min(ACTION_WIDTH, state.baseOffset + deltaX))
  swipeOffsets[id] = nextOffset
}

function handleTouchEnd(id) {
  const offset = swipeOffsets[id] || 0
  swipeOffsets[id] = offset > ACTION_WIDTH / 2 ? ACTION_WIDTH : 0
  delete touchState[id]
}

function closeSwipe(id) {
  swipeOffsets[id] = 0
}

function closeAllSwipes() {
  Object.keys(swipeOffsets).forEach((key) => {
    swipeOffsets[key] = 0
  })
}

function getSourceName(item) {
  if (item.type === "income") {
    return incomeMap.value[item.incomeItemId]?.name || "收入"
  }

  if (item.tagId) {
    return tagMap.value[item.tagId]?.name || "日常支出"
  }

  return fixedExpenseMap.value[item.fixedExpenseItemId]?.name || "固定支出"
}

function startEdit(item) {
  closeAllSwipes()
  editor.visible = true
  editor.raw = item
  editor.sourceName = getSourceName(item)
  editor.form.amount = String(item.amount || "")
  editor.form.note = item.note || ""
  editor.form.date = item.date || `${getCurrentMonth()}-01`
  editor.form.tagId = item.tagId || expenseTags.value[0]?.id || ""
}

function closeEditor() {
  editor.visible = false
  editor.raw = null
  editor.sourceName = ""
  editor.form.amount = ""
  editor.form.note = ""
  editor.form.date = ""
  editor.form.tagId = ""
}

function handleEditorTagChange(event) {
  const index = Number(event.detail.value)
  editor.form.tagId = expenseTags.value[index]?.id || ""
}

function handleEditorDateChange(event) {
  editor.form.date = event.detail.value
}

function saveEdit() {
  if (!editor.raw?.id) {
    return
  }

  const amount = normalizeAmount(editor.form.amount)
  if (!amount) {
    showToast("请输入大于0的金额")
    return
  }

  if (editor.raw.type === "expense" && editor.raw.tagId && !editor.form.tagId) {
    showToast("请选择支出标签")
    return
  }

  const saved = updateUserTransaction(currentUser.value, editor.raw.id, (current) => ({
    ...current,
    amount,
    note: editor.form.note.trim(),
    date: editor.form.date,
    tagId: current.tagId ? editor.form.tagId : current.tagId
  }))

  if (!saved) {
    showToast("更新失败，请稍后重试")
    return
  }

  closeEditor()
  loadUserData()
  budgetStore.refreshBudget()
  uni.showToast({
    title: "流水已更新",
    icon: "success"
  })
}

function handleDelete(item) {
  closeAllSwipes()
  uni.showModal({
    title: "删除流水",
    content: `确认删除这条${item.type === "income" ? "收入" : "支出"}记录吗？`,
    confirmColor: "#E74C3C",
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      const removed = removeUserTransaction(currentUser.value, item.id)
      if (!removed) {
        showToast("删除失败，请稍后重试")
        return
      }

      loadUserData()
      budgetStore.refreshBudget()
      uni.showToast({
        title: "流水已删除",
        icon: "success"
      })
    }
  })
}

onShow(() => {
  closeAllSwipes()
  if (!selectedMonth.value) {
    selectedMonth.value = getCurrentMonth()
  }
  applyCachedFilters()
  loadUserData()
  budgetStore.refreshBudget()
})

onLoad((options) => {
  applyRouteFilters(options || {})
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 190rpx;
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

.filter-card,
.group-card,
.empty-card,
.summary-card,
.modal-card {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20rpx 50rpx rgba(31, 41, 51, 0.08);
}

.context-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-bottom: 22rpx;
  padding: 18rpx 20rpx;
  border-radius: 20rpx;
  background: #eef6f1;
}

.context-text {
  flex: 1;
  font-size: 24rpx;
  color: var(--text-primary);
}

.context-clear {
  font-size: 24rpx;
  color: var(--color-primary);
}

.filter-card,
.group-card,
.empty-card {
  padding: 28rpx;
}

.filter-row + .filter-row {
  margin-top: 22rpx;
}

.filter-label,
.label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.chip-group {
  display: flex;
  gap: 16rpx;
}

.chip {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: #eef5f0;
  color: var(--text-secondary);
  font-size: 26rpx;
}

.chip.active {
  background: var(--color-primary);
  color: #fff;
}

.picker-value,
.input,
.textarea,
.readonly-value {
  border: 2rpx solid rgba(43, 122, 75, 0.14);
  border-radius: 18rpx;
  background: #fff;
  color: var(--text-primary);
  font-size: 28rpx;
}

.picker-value,
.readonly-value {
  min-height: 84rpx;
  padding: 0 22rpx;
  display: flex;
  align-items: center;
}

.input {
  width: 100%;
  height: 84rpx;
  padding: 0 22rpx;
  box-sizing: border-box;
}

.picker-value.disabled {
  color: #a4adb7;
  background: #f4f6f7;
}

.list-wrap,
.empty-card {
  margin-top: 24rpx;
}

.group-card + .group-card {
  margin-top: 24rpx;
}

.group-title {
  display: block;
  margin-bottom: 18rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.swipe-item {
  position: relative;
  overflow: hidden;
  border-radius: 22rpx;
}

.swipe-item + .swipe-item {
  margin-top: 18rpx;
}

.swipe-actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 176px;
  display: flex;
}

.edit-btn,
.delete-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 28rpx;
}

.edit-btn {
  background: #f39c12;
}

.delete-btn {
  background: #e74c3c;
}

.transaction-card {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 24rpx 22rpx;
  border-radius: 22rpx;
  background: #fff;
  transition: transform 0.18s ease;
}

.item-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 18rpx;
  min-width: 0;
}

.item-icon {
  width: 68rpx;
  height: 68rpx;
  line-height: 68rpx;
  text-align: center;
  border-radius: 20rpx;
  background: #f4f8f5;
  font-size: 34rpx;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-size: 30rpx;
  color: var(--text-primary);
}

.item-note {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-note.muted {
  color: #a0aab5;
}

.item-right {
  text-align: right;
}

.item-amount {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
}

.item-amount.expense {
  color: var(--color-danger);
}

.item-amount.income {
  color: var(--color-primary);
}

.item-time {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60rpx 28rpx;
}

.empty-illustration {
  font-size: 88rpx;
}

.empty-title {
  margin-top: 20rpx;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
  line-height: 1.7;
}

.summary-card {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 24rpx;
  padding: 22rpx 26rpx;
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.summary-item {
  flex: 1;
}

.summary-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.summary-value {
  display: block;
  margin-top: 10rpx;
  font-size: 34rpx;
  font-weight: 700;
}

.summary-value.expense {
  color: var(--color-danger);
}

.summary-value.income {
  color: var(--color-primary);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.38);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 24rpx;
  z-index: 20;
}

.modal-card {
  width: 100%;
  max-width: 720rpx;
  padding: 30rpx 28rpx;
}

.modal-title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.field {
  margin-top: 22rpx;
}

.readonly-value {
  background: #f7faf8;
}

.textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 18rpx 22rpx;
  box-sizing: border-box;
}

.modal-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 28rpx;
}

.modal-actions button {
  flex: 1;
  border-radius: 20rpx;
  font-size: 30rpx;
}

.primary-btn {
  background: var(--color-primary);
  color: #fff;
}

.ghost-btn {
  background: transparent;
  color: var(--color-primary);
  border: 2rpx solid rgba(43, 122, 75, 0.2);
}
</style>
