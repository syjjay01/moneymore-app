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

      <view v-if="!isCurrentMonth" class="back-btn" @click="backToCurrentMonth">回到当月</view>
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
        <button v-if="!isCurrentDay" class="mini-outline head-mini-btn" @click="backToToday">回到当天</button>
        <button v-else-if="canCreateExpense" class="mini-primary" size="mini" @click="openNewFlow">新支出</button>
      </view>

      <view class="day-tool-row">
        <text class="day-current-label">
          {{ showAllMonthRecords ? `当前月份：${monthLabel}` : `当前日期：${selectedDay}` }}
        </text>
        <view class="mini-outline" @click="toggleRecordMode">
          {{ showAllMonthRecords ? "按日查看" : "按月查看" }}
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
            <text class="flow-tag">{{ item.tagDisplay }}</text>
            <text v-if="showAllMonthRecords" class="flow-date">{{ item.date }}</text>
          </view>
          <view class="flow-actions">
            <text class="flow-amount">-￥{{ formatAmount(item.amount) }}</text>
            <text v-if="canOperateMonth" class="flow-edit" @click.stop="openEditFlow(item)">✎</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-box">
        {{ showAllMonthRecords ? "本月还没有支出流水。" : "当天还没有支出流水，点“新支出”记一笔。" }}
      </view>
    </view>

    <view v-if="activeTab === 'fixed'" class="card">
      <view class="card-head">
        <text class="card-title">固定支出区块</text>
        <view v-if="canOperateMonth" class="head-actions">
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
          <text v-if="canOperateMonth" class="row-delete" @click="removeFixedExpenseItem(item)">删除</text>
        </view>
      </view>
      <view v-else class="empty-box">暂无固定支出项。</view>

      <button v-if="canOperateMonth" class="primary-btn" @click="saveFixedExpenseRecords">保存固定支出</button>
    </view>

    <view v-if="activeTab === 'income'" class="card">
      <view class="card-head">
        <text class="card-title">收入区块</text>
        <view v-if="canOperateMonth" class="head-actions">
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
          <text v-if="canOperateMonth" class="row-delete" @click="removeIncomeItem(item)">删除</text>
        </view>
      </view>
      <view v-else class="empty-box">暂无收入项。</view>

      <button v-if="canOperateMonth" class="primary-btn" @click="saveIncomeRecords">保存收入</button>
    </view>

    <view v-if="newFlow.visible" class="sheet-mask" @click="closeNewFlow">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ isEditingFlow ? "编辑支出" : "新增支出" }}</text>
          <text class="sheet-close" @click="closeNewFlow">×</text>
        </view>

        <view class="field">
          <text class="field-label">内容</text>
          <input v-model="newFlow.content" class="field-input" placeholder="例如：今天吃饭" maxlength="40" />
        </view>

        <view class="field">
          <view class="amount-head">
            <text class="field-label field-label-inline">金额</text>
            <view class="amount-box amount-inline-box">
              <text class="currency">￥</text>
              <input
                v-model="newFlow.amount"
                class="amount-input"
                type="digit"
                @focus="handleFlowAmountFocus"
                @blur="handleFlowAmountBlur"
              />
            </view>
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

        <view class="field">
          <view class="voice-head">
            <text class="field-label field-label-inline">语音录入</text>
            <button class="voice-btn" :class="{ recording: isRecognizing }" @click="toggleVoiceRecognition()">
              {{ isRecognizing ? "停止识别" : "开始语音" }}
            </button>
          </view>
          <view class="voice-result-row">
            <text class="voice-raw" :class="{ empty: !voiceRecognizedText }">
              {{ voiceRecognizedText || "显示识别的语音文本，例如:买菜30元,标签买菜" }}
            </text>
          </view>
          <text class="voice-hint">识别成功后自动填充内容和金额，并自动匹配标签</text>
          <view v-if="voiceParsePreview" class="voice-preview-card">
            <text class="voice-preview-title">拆分预览</text>
            <text class="voice-preview">{{ voiceParsePreview }}</text>
          </view>
        </view>

        <button class="primary-btn" @click="saveNewFlow">{{ isEditingFlow ? "保存修改" : "保存" }}</button>
      </view>
    </view>

    <view v-if="addItemModal.visible" class="sheet-mask" @click="closeAddItemModal">
      <view class="sheet" @click.stop>
        <view class="sheet-head">
          <text class="sheet-title">{{ addItemModal.type === "income" ? "新增收入项目" : "新增固定支出项目" }}</text>
          <text class="sheet-close" @click="closeAddItemModal">×</text>
        </view>

        <view class="field">
          <text class="field-label">添加方式</text>
          <picker :range="addModeLabels" :value="addModeIndex" @change="handleAddModePick">
            <view class="picker-inline">{{ addModeLabel }}</view>
          </picker>
        </view>

        <view v-if="isRestoreMode" class="field">
          <text class="field-label">管理项目</text>
          <picker v-if="restorableItemNames.length" :range="restorableItemNames" :value="restoreItemIndex" @change="handleRestoreItemPick">
            <view class="picker-inline">{{ selectedRestoreItemName }}</view>
          </picker>
          <view v-else class="picker-inline picker-disabled">暂无可添加项目</view>
        </view>

        <view v-if="!isRestoreMode" class="field">
          <text class="field-label">名称</text>
          <input
            v-model="addItemModal.name"
            class="field-input"
            maxlength="20"
            :placeholder="addItemModal.type === 'income' ? '例如：奖金、投资收益' : '例如：房租、停车费'"
          />
        </view>

        <view v-if="!isRestoreMode && addItemModal.type === 'income'" class="field">
          <text class="field-label">类型</text>
          <picker :range="incomeTypeLabels" :value="incomeTypeIndex" @change="handleIncomeTypePick">
            <view class="picker-inline">{{ incomeTypeLabelMap[addItemModal.incomeType] }}</view>
          </picker>
        </view>

        <button class="primary-btn" @click="saveAddItemModal">{{ isRestoreMode ? "添加项目" : "保存项目" }}</button>
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
  setStorageSync,
  upsertMonthlyTransaction,
  updateUserData,
  updateUserTransaction
} from "../../utils/storage"

const budgetStore = useBudgetStore()
const RECORD_FILTER_CACHE_KEY = "MM_RECORD_FILTER_CACHE"

const tabs = [
  { label: "日常支出", value: "daily" },
  { label: "固定支出", value: "fixed" },
  { label: "收入", value: "income" }
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
const addModeLabels = ["新增自定义", "从管理项目添加"]
const SYSTEM_TAG_META = {
  tag_food: { name: "吃饭", emoji: "🍜" },
  tag_grocery: { name: "买菜", emoji: "🥬" },
  tag_fun: { name: "娱乐", emoji: "🎮" },
  tag_snack: { name: "零食", emoji: "🍪" },
  tag_household: { name: "家庭耗材", emoji: "🧻" },
  tag_clothes: { name: "衣鞋类", emoji: "👟" },
  tag_transport: { name: "出行类", emoji: "🚌" },
  tag_uncategorized: { name: "未分类", emoji: "📦" }
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
const managedIncomeItems = ref([])
const managedFixedExpenseItems = ref([])
const expenseTags = ref([])
const transactions = ref([])
const incomeAmounts = reactive({})
const fixedExpenseAmounts = reactive({})
const recordTabCustom = ref(createDefaultRecordTabCustom())

const newFlow = reactive({
  visible: false,
  content: "",
  amount: "0",
  tagId: "",
  editingId: ""
})
const addItemModal = reactive({
  visible: false,
  type: "income",
  mode: "custom",
  restoreItemId: "",
  name: "",
  incomeType: "fixed"
})

const isRecognizing = ref(false)
const recognitionSupported = ref(false)
const voiceRecognizedText = ref("")
const voiceParsePreview = ref("")
let recognition = null
const speechEngine = ref("none")
const APP_SPEECH_ENGINE_CACHE_KEY = "MM_APP_SPEECH_ENGINE"
const APP_SPEECH_ENGINE_CANDIDATES = ["baidu", "iFly", ""]
let speechConfigGuideShown = false
let speechAuthGuideShown = false
const RECORD_TAB_CUSTOM_KEY = "recordTabCustom"
const RECORD_TAB_ITEMS_KEY = "recordTabItems"

const monthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split("-")
  return `${year}年${Number(month)}月`
})

const isCurrentMonth = computed(() => selectedMonth.value === getCurrentMonth())
const isFutureMonth = computed(() => selectedMonth.value > getCurrentMonth())
const canOperateMonth = computed(() => !isFutureMonth.value)
const isCurrentDay = computed(() => selectedDay.value === getCurrentDate())
const canCreateExpense = computed(() => selectedDay.value <= getCurrentDate())
const isEditingFlow = computed(() => Boolean(newFlow.editingId))

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

function getTagDisplay(tagId) {
  const tag = expenseTagMap.value[tagId] || {}
  const tagName = tag.name || "未分类"
  const tagEmoji = tag.emoji || "🏷️"
  return `${tagEmoji} ${tagName}`
}

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
      tagEmoji: expenseTagMap.value[item.tagId]?.emoji || "",
      tagDisplay: getTagDisplay(item.tagId)
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
      tagEmoji: expenseTagMap.value[item.tagId]?.emoji || "",
      tagDisplay: getTagDisplay(item.tagId)
    }))
})

const displayRecords = computed(() => (showAllMonthRecords.value ? monthRecords.value : dailyRecords.value))
const incomeTypeIndex = computed(() => incomeTypeLabels.indexOf(incomeTypeLabelMap[addItemModal.incomeType] || "固定"))
const addModeIndex = computed(() => (addItemModal.mode === "restore" ? 1 : 0))
const addModeLabel = computed(() => addModeLabels[addModeIndex.value] || addModeLabels[0])
const isRestoreMode = computed(() => addItemModal.mode === "restore")
const displayedIncomeIds = computed(() => new Set(incomeItems.value.map((item) => item.id)))
const displayedFixedIds = computed(() => new Set(fixedExpenseItems.value.map((item) => item.id)))
const restorableIncomeItems = computed(() => {
  return managedIncomeItems.value.filter((item) => item?.id && !displayedIncomeIds.value.has(item.id))
})
const restorableFixedItems = computed(() => {
  return managedFixedExpenseItems.value.filter((item) => item?.id && !displayedFixedIds.value.has(item.id))
})
const restorableItems = computed(() => (addItemModal.type === "income" ? restorableIncomeItems.value : restorableFixedItems.value))
const restorableItemNames = computed(() => restorableItems.value.map((item) => item.name))
const restoreItemIndex = computed(() => {
  const index = restorableItems.value.findIndex((item) => item.id === addItemModal.restoreItemId)
  return index > -1 ? index : 0
})
const selectedRestoreItemName = computed(() => {
  if (!restorableItems.value.length) {
    return "暂无可添加项目"
  }
  return restorableItems.value[restoreItemIndex.value]?.name || restorableItems.value[0].name
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

function createDefaultRecordTabCustom() {
  return {
    incomeAdds: [],
    incomeHiddenIds: [],
    fixedAdds: [],
    fixedHiddenIds: []
  }
}

function inferTagMetaByName(name = "") {
  const value = String(name || "")
  if (!value) return null
  if (value.includes("吃") || value.includes("餐")) return SYSTEM_TAG_META.tag_food
  if (value.includes("菜")) return SYSTEM_TAG_META.tag_grocery
  if (value.includes("娱乐") || value.includes("游戏")) return SYSTEM_TAG_META.tag_fun
  if (value.includes("零食")) return SYSTEM_TAG_META.tag_snack
  if (value.includes("耗材") || value.includes("家庭")) return SYSTEM_TAG_META.tag_household
  if (value.includes("衣") || value.includes("鞋")) return SYSTEM_TAG_META.tag_clothes
  if (value.includes("出行") || value.includes("交通")) return SYSTEM_TAG_META.tag_transport
  if (value.includes("未分类")) return SYSTEM_TAG_META.tag_uncategorized
  return null
}

function normalizeExpenseTag(item = {}) {
  const metaById = SYSTEM_TAG_META[item?.id]
  const metaByName = inferTagMetaByName(item?.name)
  const meta = metaById || metaByName || {}
  return {
    ...item,
    id: item.id,
    name: item.name || meta.name || "未分类",
    emoji: item.emoji || item.icon || meta.emoji || "🏷️"
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

function normalizeRecordTabItems(config) {
  const next = config || {}
  return {
    incomeItems: Array.isArray(next.incomeItems) ? next.incomeItems : [],
    fixedExpenseItems: Array.isArray(next.fixedExpenseItems) ? next.fixedExpenseItems : []
  }
}

function stripRecordItemForStorage(item, type) {
  if (!item || !item.id) {
    return null
  }
  const base = {
    id: item.id,
    name: item.name || ""
  }
  if (type === "income") {
    return {
      ...base,
      type: item.type || "fixed"
    }
  }
  return {
    ...base,
    isSystem: Boolean(item.isSystem)
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
    const value = latestValue === null ? 0 : latestValue
    incomeAmounts[item.id] = String(Number.isNaN(value) ? 0 : value)
  })

  fixedExpenseItems.value.forEach((item) => {
    const latestValue = getLatestMonthlyAmount({
      type: "expense",
      keyName: "fixedExpenseItemId",
      keyValue: item.id
    })
    const value = latestValue === null ? 0 : latestValue
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

  const latestManagedIncomeItems = userData.incomeItems || userData.income_items || []
  const latestManagedFixedExpenseItems = userData.fixedExpenseItems || userData.fixed_expense_items || []
  managedIncomeItems.value = latestManagedIncomeItems.map((item) => ({
    id: item.id,
    name: item.name || "",
    type: item.type || "fixed"
  }))
  managedFixedExpenseItems.value = latestManagedFixedExpenseItems.map((item) => ({
    id: item.id,
    name: item.name || "",
    isSystem: Boolean(item.isSystem)
  }))
  const settings = userData?.settings || {}
  const storedRecordItems = normalizeRecordTabItems(settings[RECORD_TAB_ITEMS_KEY] || settings.record_tab_items)

  if (!storedRecordItems.incomeItems.length && !storedRecordItems.fixedExpenseItems.length) {
    sourceIncomeItems.value = latestManagedIncomeItems.map((item) => ({
      id: item.id,
      name: item.name || "",
      type: item.type || "fixed"
    }))
    sourceFixedExpenseItems.value = latestManagedFixedExpenseItems.map((item) => ({
      id: item.id,
      name: item.name || "",
      isSystem: Boolean(item.isSystem)
    }))

    updateUserData(currentUser.value, (data) => {
      const currentSettings = data?.settings || {}
      const snapshot = {
        incomeItems: sourceIncomeItems.value.map((item) => stripRecordItemForStorage(item, "income")).filter(Boolean),
        fixedExpenseItems: sourceFixedExpenseItems.value
          .map((item) => stripRecordItemForStorage(item, "fixed"))
          .filter(Boolean)
      }

      return {
        ...data,
        settings: {
          ...currentSettings,
          [RECORD_TAB_ITEMS_KEY]: snapshot,
          record_tab_items: snapshot
        }
      }
    })
  } else {
    sourceIncomeItems.value = storedRecordItems.incomeItems.map((item) => ({
      id: item.id,
      name: item.name || "",
      type: item.type || "fixed"
    }))
    sourceFixedExpenseItems.value = storedRecordItems.fixedExpenseItems.map((item) => ({
      id: item.id,
      name: item.name || "",
      isSystem: Boolean(item.isSystem)
    }))
  }

  expenseTags.value = (userData.expenseTags || userData.expense_tags || [])
    .map(normalizeExpenseTag)
    .filter((item) => item?.id)
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

function removeIncomeItem(item) {
  if (!canOperateMonth.value) {
    showToast("未来月份不支持删除")
    return
  }
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
  if (!canOperateMonth.value) {
    showToast("未来月份不支持删除")
    return
  }
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
  if (!canOperateMonth.value) {
    showToast("未来月份不支持保存")
    return
  }
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
  if (!canOperateMonth.value) {
    showToast("未来月份不支持保存")
    return
  }
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
  if (!canCreateExpense.value) {
    showToast("未来日期不支持新增")
    return
  }
  newFlow.visible = true
  newFlow.editingId = ""
  newFlow.content = ""
  newFlow.amount = "0"
  newFlow.tagId = newFlow.tagId || expenseTags.value[0]?.id || ""
  voiceRecognizedText.value = ""
  voiceParsePreview.value = ""
}

function openEditFlow(item) {
  if (!canOperateMonth.value) {
    showToast("未来月份不支持编辑")
    return
  }
  if (!item?.id) {
    showToast("记录异常，无法编辑")
    return
  }

  const matched = transactions.value.find((record) => record.id === item.id)
  if (!matched) {
    showToast("记录不存在或已被删除")
    return
  }

  newFlow.visible = true
  newFlow.editingId = matched.id
  newFlow.content = String(matched.note || item.content || "")
  newFlow.amount = String(Number(matched.amount || 0))
  newFlow.tagId = matched.tagId || expenseTags.value[0]?.id || ""
  voiceRecognizedText.value = ""
  voiceParsePreview.value = ""
}

function closeNewFlow() {
  stopVoiceRecognition()
  newFlow.visible = false
  newFlow.editingId = ""
  voiceRecognizedText.value = ""
  voiceParsePreview.value = ""
}

function openAddItemModal(type) {
  if (!canOperateMonth.value) {
    showToast("未来月份不支持新增")
    return
  }
  addItemModal.visible = true
  addItemModal.type = type
  addItemModal.mode = "custom"
  addItemModal.restoreItemId = (type === "income" ? restorableIncomeItems.value : restorableFixedItems.value)[0]?.id || ""
  addItemModal.name = ""
  addItemModal.incomeType = "fixed"
}

function closeAddItemModal() {
  addItemModal.visible = false
  addItemModal.mode = "custom"
  addItemModal.restoreItemId = ""
  addItemModal.name = ""
  addItemModal.incomeType = "fixed"
}

function handleAddModePick(event) {
  const index = Number(event.detail.value || 0)
  addItemModal.mode = index === 1 ? "restore" : "custom"
  if (addItemModal.mode === "restore" && !addItemModal.restoreItemId) {
    addItemModal.restoreItemId = restorableItems.value[0]?.id || ""
  }
}

function handleRestoreItemPick(event) {
  const index = Number(event.detail.value || 0)
  addItemModal.restoreItemId = restorableItems.value[index]?.id || ""
}

function handleIncomeTypePick(event) {
  const label = incomeTypeLabels[Number(event.detail.value)] || incomeTypeLabels[0]
  addItemModal.incomeType = incomeTypeValueMap[label]
}

function saveAddItemModal() {
  if (!canOperateMonth.value) {
    showToast("未来月份不支持新增")
    return
  }
  if (!currentUser.value) {
    loadUserData()
    return
  }

  if (isRestoreMode.value) {
    const selectedManagedItem =
      restorableItems.value.find((item) => item.id === addItemModal.restoreItemId) || restorableItems.value[0]
    if (!selectedManagedItem?.id) {
      showToast("暂无可添加的管理项目")
      return
    }

    const saved = saveRecordTabCustomConfig((config) => {
      if (addItemModal.type === "income") {
        const existsInSource = sourceIncomeItems.value.some((item) => item.id === selectedManagedItem.id)
        const existsInAdds = (config.incomeAdds || []).some((item) => item.id === selectedManagedItem.id)
        return {
          ...config,
          incomeHiddenIds: (config.incomeHiddenIds || []).filter((itemId) => itemId !== selectedManagedItem.id),
          incomeAdds:
            !existsInSource && !existsInAdds
              ? [
                  ...(config.incomeAdds || []),
                  {
                    id: selectedManagedItem.id,
                    name: selectedManagedItem.name,
                    type: selectedManagedItem.type || "fixed"
                  }
                ]
              : config.incomeAdds || []
        }
      }
      const existsInSource = sourceFixedExpenseItems.value.some((item) => item.id === selectedManagedItem.id)
      const existsInAdds = (config.fixedAdds || []).some((item) => item.id === selectedManagedItem.id)
      return {
        ...config,
        fixedHiddenIds: (config.fixedHiddenIds || []).filter((itemId) => itemId !== selectedManagedItem.id),
        fixedAdds:
          !existsInSource && !existsInAdds
            ? [
                ...(config.fixedAdds || []),
                {
                  id: selectedManagedItem.id,
                  name: selectedManagedItem.name,
                  isSystem: Boolean(selectedManagedItem.isSystem)
                }
              ]
            : config.fixedAdds || []
      }
    })

    if (!saved) {
      showToast("添加失败，请稍后重试")
      return
    }

    loadUserData()
    closeAddItemModal()
    showToast("项目已添加")
    return
  }

  const name = String(addItemModal.name || "").trim()
  if (!name) {
    showToast("请输入项目名称")
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
          type: addItemModal.incomeType
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
  if (!canOperateMonth.value) {
    showToast("未来月份不支持新增")
    return
  }
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

  const editing = isEditingFlow.value
  const saved = editing
    ? updateUserTransaction(currentUser.value, newFlow.editingId, {
        amount,
        tagId: newFlow.tagId,
        note: content
      })
    : saveUserTransaction(currentUser.value, {
        id: createId("expense"),
        type: "expense",
        amount,
        tagId: newFlow.tagId,
        note: content,
        date: selectedDay.value,
        createdAt: Date.now()
      })

  if (!saved) {
    showToast(editing ? "保存修改失败" : "保存流水失败")
    return
  }

  loadUserData()
  budgetStore.refreshBudget()
  closeNewFlow()
  uni.showToast({
    title: editing ? "流水已更新" : "流水已新增",
    icon: "success"
  })
}

function setupSpeechRecognition() {
  speechEngine.value = "none"

  // APP 端优先使用 plus.speech
  if (typeof plus !== "undefined" && plus?.speech) {
    recognitionSupported.value = true
    speechEngine.value = "plus"
    recognition = null
    return
  }

  // H5 端使用 Web Speech API
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
  speechEngine.value = "web"
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

function ensurePlusReady() {
  if (typeof plus !== "undefined") {
    return Promise.resolve(true)
  }
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false)
      return
    }
    document.addEventListener(
      "plusready",
      () => {
        resolve(true)
      },
      { once: true }
    )
  })
}

const CHINESE_NUMBER_MAP = {
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9
}

const CHINESE_UNIT_MAP = {
  十: 10,
  百: 100,
  千: 1000
}

const CHINESE_BIG_UNIT_MAP = {
  万: 10000,
  亿: 100000000
}

function convertChineseInteger(value = "") {
  let total = 0
  let section = 0
  let number = -1

  for (const char of value) {
    if (Object.prototype.hasOwnProperty.call(CHINESE_NUMBER_MAP, char)) {
      number = CHINESE_NUMBER_MAP[char]
      continue
    }

    if (Object.prototype.hasOwnProperty.call(CHINESE_UNIT_MAP, char)) {
      const unit = CHINESE_UNIT_MAP[char]
      if (number < 0) {
        number = 1
      }
      section += number * unit
      number = -1
      continue
    }

    if (Object.prototype.hasOwnProperty.call(CHINESE_BIG_UNIT_MAP, char)) {
      const bigUnit = CHINESE_BIG_UNIT_MAP[char]
      if (number >= 0) {
        section += number
      }
      total += section
      total *= bigUnit
      section = 0
      number = -1
    }
  }

  if (number >= 0) {
    section += number
  }

  return total + section
}

function convertChineseNumber(raw = "") {
  const value = String(raw || "").replace(/[块元圆整正]/g, "").trim()
  if (!value) {
    return null
  }
  if (value === "半") {
    return 0.5
  }

  const [integerPartRaw, decimalPartRaw] = value.split("点")
  const integerPart = convertChineseInteger(integerPartRaw || "")

  if (!decimalPartRaw) {
    return integerPart
  }

  const decimalDigits = decimalPartRaw
    .split("")
    .map((char) => (Object.prototype.hasOwnProperty.call(CHINESE_NUMBER_MAP, char) ? CHINESE_NUMBER_MAP[char] : ""))
    .join("")

  const decimalValue = decimalDigits ? Number(`0.${decimalDigits}`) : 0
  return Number((integerPart + decimalValue).toFixed(2))
}

function parseSpeechText(text = "") {
  const raw = String(text || "").trim()
  if (!raw) {
    return {
      content: "",
      amount: null
    }
  }

  const arabicMatch = raw.match(/(\d+(?:\.\d+)?)/)
  if (arabicMatch) {
    const amount = Number(arabicMatch[1])
    return {
      content: raw.slice(0, arabicMatch.index).replace(/[，,。！!；;：:]+$/g, "").trim(),
      amount: Number.isNaN(amount) ? null : amount
    }
  }

  const chineseMatch = raw.match(/[零一二两三四五六七八九十百千万亿点半]+(?:元|块|圆)?/)
  if (chineseMatch) {
    const amount = convertChineseNumber(chineseMatch[0])
    return {
      content: raw.slice(0, chineseMatch.index).replace(/[，,。！!；;：:]+$/g, "").trim(),
      amount
    }
  }

  return {
    content: raw,
    amount: null
  }
}

function matchTagIdByText(text) {
  const loweredText = text.toLowerCase()
  const matchedTag = expenseTags.value.find((item) => loweredText.includes(String(item.name || "").toLowerCase()))
  return matchedTag?.id || ""
}

function applySpeechText(text) {
  const rawText = String(text || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
  voiceRecognizedText.value = rawText
  const parsed = parseSpeechText(rawText)
  const matchedTagId = matchTagIdByText(text)
  newFlow.content = parsed.content || rawText

  if (parsed.amount !== null && parsed.amount !== undefined && !Number.isNaN(Number(parsed.amount))) {
    newFlow.amount = String(Number(parsed.amount))
  }
  voiceParsePreview.value = `已填充：内容=${newFlow.content || "未识别"}，金额=${newFlow.amount || "0"}`
  if (matchedTagId) {
    newFlow.tagId = matchedTagId
  }

  showToast("语音识别成功")
}

function showSpeechConfigGuide(message = "") {
  if (speechConfigGuideShown) {
    return
  }
  speechConfigGuideShown = true
  uni.showModal({
    title: "语音引擎未配置",
    content:
      "当前安装包缺少可用语音识别引擎。请在 manifest.json 的 app-plus > distribute > sdkConfigs > speech 配置百度或讯飞后重新打包安装。" +
      (message ? `\n\n原始错误：${message}` : ""),
    showCancel: false,
    confirmText: "我知道了",
    success: () => {
      speechConfigGuideShown = false
    }
  })
}

function showSpeechAuthGuide(message = "") {
  if (speechAuthGuideShown) {
    return
  }
  speechAuthGuideShown = true
  uni.showModal({
    title: "语音鉴权失败",
    content:
      "百度语音鉴权失败（常见为 -3004）。请核对：\n1. HBuilderX manifest 的 speech 配置是否为最新 appid/apiKey/secret；\n2. 使用的打包包名与百度控制台一致；\n3. 安卓打包证书 SHA1 与百度控制台配置一致；\n4. 修改后必须重新云打包并重装。",
    showCancel: false,
    confirmText: "去检查",
    success: () => {
      speechAuthGuideShown = false
    }
  })
  if (message) {
    showToast(`鉴权错误：${message}`)
  }
}

function isSpeechEngineMissingError(message = "") {
  return /not found engine|not support engine|invalid engine|缺少可用语音引擎|engine/i.test(String(message))
}

function isSpeechAuthError(message = "") {
  return /-3004|authentication failed|auth failed|app name unknown|鉴权/i.test(String(message))
}

async function ensureMicrophonePermission() {
  // #ifdef APP-PLUS
  const plusReady = await ensurePlusReady()
  if (plusReady && typeof plus !== "undefined" && plus?.os?.name === "Android") {
    return await new Promise((resolve) => {
      const permissionName = "android.permission.RECORD_AUDIO"
      try {
        plus.android.requestPermissions(
          [permissionName],
          (resultObj) => {
            const deniedAlways = resultObj.deniedAlways || []
            const deniedPresent = resultObj.deniedPresent || []
            const granted = !deniedAlways.includes(permissionName) && !deniedPresent.includes(permissionName)
            if (!granted) {
              showToast("请先开启麦克风权限")
            }
            resolve(granted)
          },
          () => {
            showToast("麦克风权限申请失败")
            resolve(false)
          }
        )
      } catch (error) {
        showToast("麦克风权限申请失败")
        resolve(false)
      }
    })
  }
  if (plusReady) {
    return true
  }
  // #endif

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
  if (!isRecognizing.value) {
    return
  }

  if (speechEngine.value === "plus" && typeof plus !== "undefined" && plus?.speech) {
    plus.speech.stopRecognize()
  } else if (recognition) {
    recognition.stop()
  }

  isRecognizing.value = false
}

async function startVoiceRecognition() {
  try {
    const permissionGranted = await ensureMicrophonePermission()
    if (!permissionGranted) {
      return
    }

    setupSpeechRecognition()
    if (!recognitionSupported.value) {
      showToast("当前环境不支持语音识别")
      return
    }

    if (speechEngine.value === "plus" && typeof plus !== "undefined" && plus?.speech) {
      const cachedEngine = String(getStorageSync(APP_SPEECH_ENGINE_CACHE_KEY) || "").trim()
      const engineQueue = [
        cachedEngine,
        ...APP_SPEECH_ENGINE_CANDIDATES.filter((item) => item !== cachedEngine)
      ].filter((item, index, list) => list.indexOf(item) === index)

      const startSystemRecognizer = () => {
        plus.speech.startRecognize(
          {
            userInterface: true,
            timeout: 15,
            punctuation: false
          },
          (result) => {
            isRecognizing.value = false
            const text = String(result || "").trim()
            if (!text) {
              showToast("无法识别，请手动输入")
              return
            }
            applySpeechText(text)
          },
          (error) => {
            isRecognizing.value = false
            const message = String(error?.message || error || "")
            if (message) {
              showToast(`语音识别失败：${message}`)
            } else {
              showToast("无法识别，请手动输入")
            }
            if (isSpeechAuthError(message)) {
              showSpeechAuthGuide(message)
            } else if (isSpeechEngineMissingError(message)) {
              showSpeechConfigGuide(message)
            }
          }
        )
      }

      const tryStartByEngine = (engineIndex = 0) => {
        if (engineIndex >= engineQueue.length) {
          // 再尝试一次系统识别器（部分机型可用）
          startSystemRecognizer()
          return
        }

        const engine = engineQueue[engineIndex]
        const options = {
          timeout: 15,
          punctuation: false
        }
        if (engine) {
          options.engine = engine
        }

        plus.speech.startRecognize(
          options,
          (result) => {
            isRecognizing.value = false
            setStorageSync(APP_SPEECH_ENGINE_CACHE_KEY, engine)
            const text = String(result || "").trim()
            if (!text) {
              showToast("无法识别，请手动输入")
              return
            }
            applySpeechText(text)
          },
          (error) => {
            const message = String(error?.message || error || "")
            const shouldFallback = isSpeechEngineMissingError(message) && engineIndex < engineQueue.length - 1
            if (shouldFallback) {
              tryStartByEngine(engineIndex + 1)
              return
            }

            const shouldTrySystem = isSpeechEngineMissingError(message) && engineIndex >= engineQueue.length - 1
            if (shouldTrySystem) {
              startSystemRecognizer()
              return
            }

            isRecognizing.value = false
            if (message) {
              showToast(`语音识别失败：${message}`)
            } else {
              showToast("无法识别，请手动输入")
            }
            if (isSpeechAuthError(message)) {
              showSpeechAuthGuide(message)
            } else if (isSpeechEngineMissingError(message)) {
              showSpeechConfigGuide(message)
            }
          }
        )
      }

      isRecognizing.value = true
      tryStartByEngine(0)
      return
    }

    if (!recognition) {
      showToast("当前环境不支持语音识别")
      return
    }

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

watch(activeTab, (tab) => {
  if (tab !== "daily") {
    return
  }

  if (selectedMonth.value === getCurrentMonth()) {
    selectedDay.value = getCurrentDate()
  }

  nextTick(() => {
    refreshDayScrollPosition()
  })
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
  margin: 14rpx auto 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 196rpx;
  min-width: 0;
  padding: 0 24rpx;
  height: 56rpx;
  line-height: 56rpx;
  border-radius: 999rpx;
  background: #1f7a4d;
  color: #fff;
  white-space: nowrap !important;
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
  gap: 8rpx;
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

.head-mini-btn {
  margin: 0;
  min-width: 132rpx;
  height: 56rpx;
  line-height: 56rpx;
  font-size: 22rpx;
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

.flow-main {
  flex: 1;
  min-width: 0;
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

.flow-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8rpx;
  margin-left: 12rpx;
}

.flow-edit {
  width: 44rpx;
  height: 44rpx;
  line-height: 44rpx;
  border-radius: 12rpx;
  text-align: center;
  font-size: 24rpx;
  color: #2c6ad7;
  background: #eaf2ff;
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

.flow-amount-box {
  width: 100%;
}

.amount-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8rpx;
}

.amount-inline-box {
  width: 300rpx;
  max-width: 75%;
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
  box-sizing: border-box;
  padding-top: 24rpx;
  padding-left: 24rpx;
  padding-right: calc(24rpx + constant(safe-area-inset-right));
  padding-right: calc(24rpx + env(safe-area-inset-right));
  padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
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

.field-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #8a9cb0;
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
  min-width: 128rpx;
  flex-shrink: 0;
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

.voice-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.field-label-inline {
  margin-bottom: 0;
}

.voice-result-row {
  margin-top: 10rpx;
}

.voice-raw {
  display: block;
  width: 100%;
  height: 76rpx;
  line-height: 76rpx;
  padding: 0 16rpx;
  border-radius: 14rpx;
  background: #f5f8fc;
  border: 1rpx solid rgba(22, 50, 74, 0.1);
  font-size: 24rpx;
  color: #3f566b;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.voice-raw.empty {
  color: #8ea0b3;
}

.voice-hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #7f92a5;
  line-height: 1.5;
}

.voice-preview-card {
  margin-top: 10rpx;
  padding: 12rpx 14rpx;
  border-radius: 12rpx;
  background: #eaf7f0;
  border: 1rpx solid rgba(43, 122, 75, 0.22);
}

.voice-preview-title {
  display: block;
  font-size: 22rpx;
  color: #2b7a4b;
  font-weight: 600;
}

.voice-preview {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #3f566b;
  line-height: 1.5;
}

.picker-disabled {
  color: #8ea0b3;
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
