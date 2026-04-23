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
        <button class="mini-primary" size="mini" @click="openNewFlow">新支出</button>
      </view>

      <view class="day-tool-row">
        <text class="day-current-label">
          {{ showAllMonthRecords ? `当前月份：${monthLabel}` : `当前日期：${selectedDay}` }}
        </text>
        <view class="day-tool-actions">
          <view class="mini-outline" @click="toggleRecordMode">
            {{ showAllMonthRecords ? "按日查看" : "查看当月全部" }}
          </view>
          <view v-if="!isCurrentDay" class="mini-outline" @click="backToToday">回到当天</view>
        </view>
      </view>

      <view v-if="contextLabel" class="context-line">
        <text>{{ contextLabel }}</text>
        <text class="context-clear" @click="clearContextFilter">清除</text>
      </view>

      <scroll-view
        v-if="!showAllMonthRecords"
        class="day-scroll"
        scroll-x
        scroll-with-animation
        :scroll-into-view="dayScrollIntoView"
      >
        <view class="day-list">
          <view
            v-for="day in monthDays"
            :key="day.date"
            :id="`day-${day.date}`"
            class="day-chip"
            :class="{ active: selectedDay === day.date }"
            @click="selectedDay = day.date"
          >
            {{ day.label }}
          </view>
        </view>
      </scroll-view>

      <view v-if="displayRecords.length" class="flow-list">
        <view v-for="item in displayRecords" :key="item.id" class="flow-item">
          <view class="flow-main">
            <text class="flow-content">{{ item.content }}</text>
            <text class="flow-tag">{{ item.tagEmoji ? `${item.tagEmoji} ` : "" }}{{ item.tagName }}</text>
            <text v-if="showAllMonthRecords" class="flow-date">{{ item.date }}</text>
          </view>
          <text class="flow-amount">-￥{{ formatAmount(item.amount) }}</text>
        </view>
      </view>
      <view v-else class="empty-box">
        {{ showAllMonthRecords ? "本月还没有支出流水。" : "当天还没有支出流水，点“新支出”记一笔。" }}
      </view>
    </view>

    <view v-if="activeTab === 'fixed'" class="card">
      <view class="card-head">
        <text class="card-title">固定支出区块</text>
        <view class="head-actions">
          <text class="manage-link" @click="goToManagePage('/pages/fixed-expense/fixed-expense-management')">管理</text>
          <text class="manage-link" @click="openAddItemModal('fixed')">新增项目</text>
        </view>
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
          <text class="row-delete" @click="removeFixedExpenseItem(item)">删除</text>
        </view>
      </view>
      <view v-else class="empty-box">暂无固定支出项。</view>

      <button class="primary-btn" @click="saveFixedExpenseRecords">保存固定支出</button>
    </view>

    <view v-if="activeTab === 'income'" class="card">
      <view class="card-head">
        <text class="card-title">收入区块</text>
        <view class="head-actions">
          <text class="manage-link" @click="goToManagePage('/pages/income/income-management')">管理</text>
          <text class="manage-link" @click="openAddItemModal('income')">新增项目</text>
        </view>
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
          <text class="row-delete" @click="removeIncomeItem(item)">删除</text>
        </view>
      </view>
      <view v-else class="empty-box">暂无收入项。</view>

      <button class="primary-btn" @click="saveIncomeRecords">保存收入</button>
    </view>

    <view v-if="newFlow.visible" class="sheet-mask" @click="closeNewFlow">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">新增支出</text>
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

    <view v-if="addItemModal.visible" class="sheet-mask" @click="closeAddItemModal">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ addItemModal.type === "income" ? "新增收入项目" : "新增固定支出项目" }}</text>
          <text class="sheet-close" @click="closeAddItemModal">×</text>
        </view>

        <view class="field">
          <text class="field-label">名称</text>
          <input
            v-model="addItemModal.name"
            class="field-input"
            maxlength="20"
            :placeholder="addItemModal.type === 'income' ? '例如：奖金、投资收益' : '例如：房租、停车费'"
          />
        </view>

        <view v-if="addItemModal.type === 'income'" class="field">
          <text class="field-label">类型</text>
          <picker :range="incomeTypeLabels" :value="incomeTypeIndex" @change="handleIncomeTypePick">
            <view class="picker-inline">{{ incomeTypeLabelMap[addItemModal.incomeType] }}</view>
          </picker>
        </view>

        <view class="field">
          <text class="field-label">默认金额</text>
          <view class="field-amount-row">
            <view class="amount-box flex-1">
              <text class="currency">￥</text>
              <input
                v-model="addItemModal.defaultAmount"
                class="amount-input"
                type="digit"
                @focus="handleAddItemAmountFocus"
                @blur="handleAddItemAmountBlur"
              />
            </view>
          </view>
        </view>

        <button class="primary-btn" @click="saveAddItemModal">保存项目</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from "vue"
import { onHide, onShow } from "@dcloudio/uni-app"
import { useBudgetStore } from "../../stores/budget"
import {
  getCurrentUser,
  getCurrentUserData,
  getStorageSync,
  removeStorageSync,
  saveUserTransaction,
  upsertMonthlyTransaction,
  updateUserData
} from "../../utils/storage"

const budgetStore = useBudgetStore()
const RECORD_FILTER_CACHE_KEY = "MM_RECORD_FILTER_CACHE"

const tabs = [
  { label: "日常支出区块", value: "daily" },
  { label: "固定支出区块", value: "fixed" },
  { label: "收入区块", value: "income" }
]
const incomeTypeLabelMap = {
  fixed: "固定",
  variable: "波动",
  other: "其他"
}
const incomeTypeLabels = ["固定", "波动", "其他"]
const incomeTypeValueMap = {
  固定: "fixed",
  波动: "variable",
  其他: "other"
}

const currentUser = ref("")
const activeTab = ref("daily")
const selectedMonth = ref(getCurrentMonth())
const selectedDay = ref(getCurrentDate())
const showAllMonthRecords = ref(false)
const dayScrollIntoView = ref("")
const contextLabel = ref("")
const contextTagId = ref("")

const incomeItems = ref([])
const fixedExpenseItems = ref([])
const sourceIncomeItems = ref([])
const sourceFixedExpenseItems = ref([])
const expenseTags = ref([])
const transactions = ref([])
const incomeAmounts = reactive({})
const fixedExpenseAmounts = reactive({})
const recordTabCustom = ref(createDefaultRecordTabCustom())

const newFlow = reactive({
  visible: false,
  content: "",
  amount: "0",
  tagId: ""
})
const addItemModal = reactive({
  visible: false,
  type: "income",
  name: "",
  defaultAmount: "0",
  incomeType: "fixed"
})

const isRecognizing = ref(false)
const recognitionSupported = ref(false)
let recognition = null
const RECORD_TAB_CUSTOM_KEY = "recordTabCustom"

const monthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split("-")
  return `${year}年${Number(month)}月`
})

const isCurrentMonth = computed(() => selectedMonth.value === getCurrentMonth())
const isCurrentDay = computed(() => selectedDay.value === getCurrentDate())

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
      date: item.date,
      tagName: expenseTagMap.value[item.tagId]?.name || "未分类",
      tagEmoji: expenseTagMap.value[item.tagId]?.emoji || ""
    }))
})

const monthRecords = computed(() => {
  return transactions.value
    .filter((item) => {
      if (item.type !== "expense") {
        return false
      }
      if (!item.tagId) {
        return false
      }
      if (String(item.date || "").slice(0, 7) !== selectedMonth.value) {
        return false
      }
      if (contextTagId.value && item.tagId !== contextTagId.value) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      const dateCompare = String(b.date || "").localeCompare(String(a.date || ""))
      if (dateCompare !== 0) {
        return dateCompare
      }
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
    })
    .map((item) => ({
      id: item.id,
      content: item.note || expenseTagMap.value[item.tagId]?.name || "日常支出",
      amount: Number(item.amount || 0),
      date: item.date,
      tagName: expenseTagMap.value[item.tagId]?.name || "未分类",
      tagEmoji: expenseTagMap.value[item.tagId]?.emoji || ""
    }))
})

const displayRecords = computed(() => (showAllMonthRecords.value ? monthRecords.value : dailyRecords.value))
const incomeTypeIndex = computed(() => incomeTypeLabels.indexOf(incomeTypeLabelMap[addItemModal.incomeType] || "固定"))

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

function createDefaultRecordTabCustom() {
  return {
    incomeAdds: [],
    incomeHiddenIds: [],
    fixedAdds: [],
    fixedHiddenIds: []
  }
}

function normalizeRecordTabCustom(config) {
  const base = createDefaultRecordTabCustom()
  const next = { ...base, ...(config || {}) }
  return {
    incomeAdds: Array.isArray(next.incomeAdds) ? next.incomeAdds : [],
    incomeHiddenIds: Array.isArray(next.incomeHiddenIds) ? next.incomeHiddenIds : [],
    fixedAdds: Array.isArray(next.fixedAdds) ? next.fixedAdds : [],
    fixedHiddenIds: Array.isArray(next.fixedHiddenIds) ? next.fixedHiddenIds : []
  }
}

function mergeRecordItems(baseList, addList, hiddenIds, addFlagKey = "__fromRecordCustom") {
  const hiddenSet = new Set(Array.isArray(hiddenIds) ? hiddenIds : [])
  const normalizedBase = (Array.isArray(baseList) ? baseList : [])
    .filter((item) => item?.id && !hiddenSet.has(item.id))
    .map((item) => ({
      ...item,
      [addFlagKey]: false
    }))
  const normalizedAdds = (Array.isArray(addList) ? addList : [])
    .filter((item) => item?.id && !hiddenSet.has(item.id))
    .map((item) => ({
      ...item,
      [addFlagKey]: true
    }))
  return [...normalizedBase, ...normalizedAdds]
}

function applyRecordTabItems() {
  incomeItems.value = mergeRecordItems(
    sourceIncomeItems.value,
    recordTabCustom.value.incomeAdds,
    recordTabCustom.value.incomeHiddenIds
  )
  fixedExpenseItems.value = mergeRecordItems(
    sourceFixedExpenseItems.value,
    recordTabCustom.value.fixedAdds,
    recordTabCustom.value.fixedHiddenIds
  )
}

function saveRecordTabCustomConfig(updater) {
  if (!currentUser.value) {
    return false
  }

  return updateUserData(currentUser.value, (userData) => {
    const settings = userData?.settings || {}
    const currentConfig = normalizeRecordTabCustom(settings[RECORD_TAB_CUSTOM_KEY] || settings.record_tab_custom)
    const nextConfig = normalizeRecordTabCustom(
      typeof updater === "function" ? updater(currentConfig) : updater
    )

    return {
      ...userData,
      settings: {
        ...settings,
        [RECORD_TAB_CUSTOM_KEY]: nextConfig,
        record_tab_custom: nextConfig
      }
    }
  })
}

function normalizeAmount(value) {
  const amount = Number(value)
  if (Number.isNaN(amount) || amount < 0) {
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

  if (!matched.length) {
    return null
  }

  return Number(matched[0]?.amount || 0)
}

function syncAmountInputs() {
  incomeItems.value.forEach((item) => {
    const latestValue = getLatestMonthlyAmount({
      type: "income",
      keyName: "incomeItemId",
      keyValue: item.id
    })
    const defaultValue = Number(item.defaultAmount || 0)
    const value = latestValue === null ? defaultValue : latestValue
    incomeAmounts[item.id] = String(Number.isNaN(value) ? 0 : value)
  })

  fixedExpenseItems.value.forEach((item) => {
    const latestValue = getLatestMonthlyAmount({
      type: "expense",
      keyName: "fixedExpenseItemId",
      keyValue: item.id
    })
    const defaultValue = Number(item.defaultAmount || 0)
    const value = latestValue === null ? defaultValue : latestValue
    fixedExpenseAmounts[item.id] = String(Number.isNaN(value) ? 0 : value)
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

  sourceIncomeItems.value = userData.incomeItems || userData.income_items || []
  sourceFixedExpenseItems.value = userData.fixedExpenseItems || userData.fixed_expense_items || []
  expenseTags.value = userData.expenseTags || userData.expense_tags || []
  transactions.value = userData.transactions || []
  recordTabCustom.value = normalizeRecordTabCustom(
    userData?.settings?.[RECORD_TAB_CUSTOM_KEY] || userData?.settings?.record_tab_custom
  )
  applyRecordTabItems()

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

function backToToday() {
  selectedMonth.value = getCurrentMonth()
  selectedDay.value = getCurrentDate()
  showAllMonthRecords.value = false
  activeTab.value = "daily"
  syncAmountInputs()
}

function toggleRecordMode() {
  showAllMonthRecords.value = !showAllMonthRecords.value
  if (!showAllMonthRecords.value) {
    refreshDayScrollPosition()
  }
}

function refreshDayScrollPosition() {
  if (showAllMonthRecords.value) {
    return
  }

  const target = `day-${selectedDay.value}`
  dayScrollIntoView.value = ""
  nextTick(() => {
    dayScrollIntoView.value = target
  })
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
    return false
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
  return true
}

function clearContextFilter() {
  contextTagId.value = ""
  contextLabel.value = ""
}

function goToManagePage(url) {
  uni.navigateTo({ url })
}

function removeIncomeItem(item) {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  uni.showModal({
    title: "删除收入项",
    content: `确认删除“${item.name}”吗？`,
    confirmColor: "#E74C3C",
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      const saved = saveRecordTabCustomConfig((config) => {
        if (item.__fromRecordCustom) {
          return {
            ...config,
            incomeAdds: (config.incomeAdds || []).filter((current) => current.id !== item.id)
          }
        }

        const hidden = new Set(config.incomeHiddenIds || [])
        hidden.add(item.id)
        return {
          ...config,
          incomeHiddenIds: [...hidden]
        }
      })
      if (!saved) {
        showToast("删除失败，请稍后重试")
        return
      }

      loadUserData()
      showToast("收入项已删除")
    }
  })
}

function removeFixedExpenseItem(item) {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  uni.showModal({
    title: "删除固定支出项",
    content: `确认删除“${item.name}”吗？`,
    confirmColor: "#E74C3C",
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      const saved = saveRecordTabCustomConfig((config) => {
        if (item.__fromRecordCustom) {
          return {
            ...config,
            fixedAdds: (config.fixedAdds || []).filter((current) => current.id !== item.id)
          }
        }

        const hidden = new Set(config.fixedHiddenIds || [])
        hidden.add(item.id)
        return {
          ...config,
          fixedHiddenIds: [...hidden]
        }
      })
      if (!saved) {
        showToast("删除失败，请稍后重试")
        return
      }

      loadUserData()
      showToast("固定支出项已删除")
    }
  })
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

function openAddItemModal(type) {
  addItemModal.visible = true
  addItemModal.type = type
  addItemModal.name = ""
  addItemModal.defaultAmount = "0"
  addItemModal.incomeType = "fixed"
}

function closeAddItemModal() {
  addItemModal.visible = false
  addItemModal.name = ""
  addItemModal.defaultAmount = "0"
  addItemModal.incomeType = "fixed"
}

function handleIncomeTypePick(event) {
  const label = incomeTypeLabels[Number(event.detail.value)] || incomeTypeLabels[0]
  addItemModal.incomeType = incomeTypeValueMap[label]
}

function handleAddItemAmountFocus() {
  if (String(addItemModal.defaultAmount) === "0") {
    addItemModal.defaultAmount = ""
  }
}

function handleAddItemAmountBlur() {
  if (String(addItemModal.defaultAmount || "").trim() === "") {
    addItemModal.defaultAmount = "0"
  }
}

function saveAddItemModal() {
  if (!currentUser.value) {
    loadUserData()
    return
  }

  const name = String(addItemModal.name || "").trim()
  if (!name) {
    showToast("请输入项目名称")
    return
  }

  const defaultAmount = normalizeAmount(addItemModal.defaultAmount)
  if (defaultAmount === null) {
    showToast("默认金额格式不正确")
    return
  }

  if (addItemModal.type === "income") {
    const duplicated = [...sourceIncomeItems.value, ...(recordTabCustom.value.incomeAdds || [])].some(
      (item) => item.name === name
    )
    if (duplicated) {
      showToast("收入项目名称已存在")
      return
    }

    const saved = saveRecordTabCustomConfig((config) => ({
      ...config,
      incomeAdds: [
        ...(config.incomeAdds || []),
        {
          id: createId("income_item"),
          name,
          type: addItemModal.incomeType,
          defaultAmount
        }
      ]
    }))
    if (!saved) {
      showToast("保存失败，请稍后重试")
      return
    }
  } else {
    const duplicated = [...sourceFixedExpenseItems.value, ...(recordTabCustom.value.fixedAdds || [])].some(
      (item) => item.name === name
    )
    if (duplicated) {
      showToast("固定支出项目名称已存在")
      return
    }

    const saved = saveRecordTabCustomConfig((config) => ({
      ...config,
      fixedAdds: [
        ...(config.fixedAdds || []),
        {
          id: createId("fixed_item"),
          name,
          defaultAmount,
          isSystem: false
        }
      ]
    }))
    if (!saved) {
      showToast("保存失败，请稍后重试")
      return
    }
  }

  loadUserData()
  closeAddItemModal()
  showToast("项目已新增")
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
  const hasFilter = applyRecordFilter()

  if (!selectedDay.value.startsWith(selectedMonth.value)) {
    updateSelectedDayForMonth()
  }

  if (!hasFilter && selectedMonth.value === getCurrentMonth()) {
    selectedDay.value = getCurrentDate()
  }

  refreshDayScrollPosition()
})

watch(selectedDay, () => {
  refreshDayScrollPosition()
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

.head-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
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

.day-tool-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}

.day-current-label {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #6f8191;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.day-tool-actions {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex-shrink: 0;
}

.mini-outline {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  padding: 0 18rpx;
  height: 52rpx;
  line-height: 52rpx;
  box-sizing: border-box;
  border-radius: 999rpx;
  color: #1f7a4d;
  background: rgba(31, 122, 77, 0.06);
  border: 1rpx solid rgba(31, 122, 77, 0.42);
  font-size: 22rpx;
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

.flow-date {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a9bb0;
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

.row-delete {
  flex-shrink: 0;
  color: #d64541;
  font-size: 24rpx;
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

.picker-inline {
  height: 76rpx;
  border-radius: 14rpx;
  padding: 0 16rpx;
  background: #f5f8fc;
  border: 1rpx solid rgba(22, 50, 74, 0.1);
  font-size: 28rpx;
  color: #162d40;
  display: flex;
  align-items: center;
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
