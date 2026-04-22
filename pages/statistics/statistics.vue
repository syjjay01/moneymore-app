<template>
  <view class="page">
    <view class="hero-card">
      <view class="month-switcher">
        <text class="switch-arrow" @click="changeMonth(-1)">‹</text>
        <picker mode="date" fields="month" :value="`${selectedMonth}-01`" class="month-picker" @change="handleMonthPick">
          <view class="month-center">
            <text class="hero-kicker">月度统计</text>
            <text class="hero-title">{{ monthLabel }}</text>
          </view>
        </picker>
        <text class="switch-arrow" @click="changeMonth(1)">›</text>
      </view>
      <button v-if="!isCurrentMonth" class="back-btn" size="mini" @click="backToCurrentMonth">回到当月</button>
      <text class="hero-desc">图表基于当前账号本地账本数据生成，切换月份会同步更新统计结果。</text>
    </view>

    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-label">本月总收入</text>
        <text class="summary-value income">+{{ formatAmount(monthlyIncome) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">本月总支出</text>
        <text class="summary-value" :class="{ expense: isOverBudget }">-{{ formatAmount(monthlyExpense) }}</text>
      </view>
      <view class="summary-item">
        <text class="summary-label">本月结余</text>
        <text class="summary-value">{{ formatAmount(monthlyBalance) }}</text>
      </view>
    </view>

    <view class="budget-card">
      <view class="budget-head">
        <view>
          <text class="budget-title">预算进度</text>
          <text class="budget-desc">月度预算 ¥{{ formatAmount(monthlyBudget) }}</text>
        </view>
        <text class="budget-rate" :class="{ warning: isOverBudget }">{{ budgetProgress }}%</text>
      </view>

      <view class="progress-track">
        <view
          class="progress-fill"
          :class="{ warning: isOverBudget }"
          :style="{ width: `${budgetProgress}%` }"
        />
      </view>

      <text v-if="isOverBudget" class="budget-warning">本月已超预算 ¥{{ formatAmount(overBudgetAmount) }}</text>
      <text v-else class="budget-note">当前距预算上限还剩 ¥{{ formatAmount(remainingBudget) }}</text>
    </view>

    <view class="chart-card">
      <view class="card-head">
        <view>
          <text class="card-title">支出分类占比</text>
          <text class="card-desc">按标签和固定支出项目聚合，点击图例或图形可查看明细。</text>
        </view>
      </view>
      <uni-echarts class="chart" :option="pieOption" @click="handlePieClick" />
    </view>

    <view class="chart-card">
      <view class="card-head">
        <view>
          <text class="card-title">每日支出趋势</text>
          <text class="card-desc">红点表示累计支出首次进入超预算区间后的日期。</text>
        </view>
      </view>
      <uni-echarts class="chart" :option="lineOption" />
    </view>

    <view class="chart-card">
      <view class="card-head">
        <view>
          <text class="card-title">近6个月支出对比</text>
          <text class="card-desc">帮助你观察支出是否持续上升。</text>
        </view>
      </view>
      <uni-echarts class="chart" :option="barOption" />
    </view>

    <view class="insight-card">
      <text class="insight-title">本月小结</text>
      <text class="insight-text">{{ summaryText }}</text>
    </view>

    <view v-if="detailPopup.visible" class="modal-mask" @click="closeDetailPopup">
      <view class="modal-card" @click.stop>
        <view class="modal-head">
          <text class="modal-title">{{ detailPopup.title }} 明细</text>
          <text class="modal-close" @click="closeDetailPopup">×</text>
        </view>

        <view v-if="detailPopup.records.length" class="detail-list">
          <view
            v-for="item in detailPopup.records"
            :key="item.id"
            class="detail-item clickable"
            @click="goToTransactionDetail(item)"
          >
            <view class="detail-main">
              <text class="detail-name">{{ item.name }}</text>
              <text class="detail-note">{{ item.note || "无备注" }}</text>
            </view>
            <view class="detail-side">
              <text class="detail-amount">-{{ formatAmount(item.amount) }}</text>
              <text class="detail-time">{{ item.date }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-state">该分类下暂无支出明细。</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from "vue"
import UniEcharts from "uni-echarts"
import { provideEcharts } from "uni-echarts/shared"
import * as echarts from "echarts/core"
import { PieChart, LineChart, BarChart } from "echarts/charts"
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkPointComponent
} from "echarts/components"
import { CanvasRenderer } from "echarts/renderers"
import { onShow } from "@dcloudio/uni-app"
import { useBudgetStore } from "../../stores/budget"
import { getCurrentUser, getCurrentUserData, setStorageSync } from "../../utils/storage"

echarts.use([
  PieChart,
  LineChart,
  BarChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  MarkPointComponent,
  CanvasRenderer
])

provideEcharts(echarts)

const budgetStore = useBudgetStore()
const RECORD_FILTER_CACHE_KEY = "MM_RECORD_FILTER_CACHE"
const currentUser = ref("")
const selectedMonth = ref("")
const transactions = ref([])
const expenseTags = ref([])
const incomeItems = ref([])
const fixedExpenseItems = ref([])
const detailPopup = reactive({
  visible: false,
  title: "",
  records: [],
  filter: {
    tagId: "",
    tagName: "",
    fixedExpenseItemId: "",
    fixedExpenseName: ""
  }
})

const categoryColorFallback = ["#2B7A4B", "#E67E22", "#E74C3C", "#3498DB", "#8E44AD", "#16A085", "#D35400", "#2C3E50"]

const expenseTagMap = computed(() => {
  return expenseTags.value.reduce((acc, item) => {
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

const incomeItemMap = computed(() => {
  return incomeItems.value.reduce((acc, item) => {
    acc[item.id] = item
    return acc
  }, {})
})

const monthLabel = computed(() => {
  const [year, month] = selectedMonth.value.split("-")
  return `${year}年${Number(month)}月`
})
const isCurrentMonth = computed(() => selectedMonth.value === getCurrentMonth())

const monthlyTransactions = computed(() => {
  return transactions.value.filter((item) => String(item.date || "").slice(0, 7) === selectedMonth.value)
})

const monthlyIncome = computed(() => {
  return monthlyTransactions.value.reduce((total, item) => {
    if (item.type !== "income") {
      return total
    }

    return total + Number(item.amount || 0)
  }, 0)
})

const monthlyExpense = computed(() => {
  return monthlyTransactions.value.reduce((total, item) => {
    if (item.type !== "expense") {
      return total
    }

    return total + Number(item.amount || 0)
  }, 0)
})

const monthlyBalance = computed(() => Number((monthlyIncome.value - monthlyExpense.value).toFixed(2)))
const monthlyBudget = computed(() => Number(budgetStore.monthlyBudget || 0))
const isOverBudget = computed(() => monthlyExpense.value > monthlyBudget.value)
const overBudgetAmount = computed(() => Math.max(0, Number((monthlyExpense.value - monthlyBudget.value).toFixed(2))))
const remainingBudget = computed(() => Math.max(0, Number((monthlyBudget.value - monthlyExpense.value).toFixed(2))))
const budgetProgress = computed(() => {
  if (!monthlyBudget.value) {
    return monthlyExpense.value > 0 ? 100 : 0
  }

  return Math.min(100, Number(((monthlyExpense.value / monthlyBudget.value) * 100).toFixed(2)))
})

const expenseCategoryStats = computed(() => {
  const map = {}

  monthlyTransactions.value.forEach((item) => {
    if (item.type !== "expense") {
      return
    }

    let key = ""
    let label = ""
    let color = ""

    if (item.tagId) {
      const tag = expenseTagMap.value[item.tagId]
      key = item.tagId
      label = tag?.name || "未分类"
      color = tag?.color || ""
    } else if (item.fixedExpenseItemId) {
      const fixedItem = fixedExpenseMap.value[item.fixedExpenseItemId]
      key = `fixed_${item.fixedExpenseItemId}`
      label = fixedItem?.name || "固定支出"
      color = fixedItem?.color || "#A55233"
    } else {
      key = "uncategorized"
      label = "未分类"
      color = "#7F8C8D"
    }

    if (!map[key]) {
      map[key] = {
        key,
        name: label,
        value: 0,
        color,
        records: []
      }
    }

    map[key].value += Number(item.amount || 0)
    map[key].records.push({
      id: item.id,
      amount: Number(item.amount || 0),
      note: item.note || "",
      date: item.date,
      name: label,
      tagId: item.tagId || "",
      fixedExpenseItemId: item.fixedExpenseItemId || ""
    })
  })

  return Object.values(map)
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      ...item,
      color: item.color || categoryColorFallback[index % categoryColorFallback.length]
    }))
})

const daysInSelectedMonth = computed(() => {
  const [year, month] = selectedMonth.value.split("-").map(Number)
  return new Date(year, month, 0).getDate()
})

const dailyTrend = computed(() => {
  const totals = Array.from({ length: daysInSelectedMonth.value }, (_, index) => ({
    day: index + 1,
    value: 0,
    cumulative: 0
  }))

  monthlyTransactions.value.forEach((item) => {
    if (item.type !== "expense") {
      return
    }

    const day = Number(String(item.date || "").slice(8, 10))
    if (!day || !totals[day - 1]) {
      return
    }

    totals[day - 1].value += Number(item.amount || 0)
  })

  let cumulative = 0
  return totals.map((item) => {
    cumulative += item.value
    return {
      ...item,
      cumulative: Number(cumulative.toFixed(2)),
      overBudget: cumulative > monthlyBudget.value && item.value > 0
    }
  })
})

const recentSixMonths = computed(() => {
  const list = []

  for (let i = 5; i >= 0; i -= 1) {
    const monthKey = shiftMonth(selectedMonth.value, -i)
    const expense = transactions.value.reduce((total, item) => {
      const isMonthMatched = String(item.date || "").slice(0, 7) === monthKey
      if (!isMonthMatched || item.type !== "expense") {
        return total
      }

      return total + Number(item.amount || 0)
    }, 0)

    list.push({
      monthKey,
      label: monthKey.slice(5).replace("-", "/"),
      value: Number(expense.toFixed(2))
    })
  }

  return list
})

const summaryText = computed(() => {
  const previousMonthKey = shiftMonth(selectedMonth.value, -1)
  const previousExpense = transactions.value.reduce((total, item) => {
    const isTargetMonth = String(item.date || "").slice(0, 7) === previousMonthKey
    if (!isTargetMonth || item.type !== "expense") {
      return total
    }
    return total + Number(item.amount || 0)
  }, 0)

  const delta = monthlyExpense.value - previousExpense
  const ratio = previousExpense > 0 ? Math.abs((delta / previousExpense) * 100).toFixed(1) : "100.0"
  const direction = delta > 0 ? "增加" : delta < 0 ? "减少" : "持平"
  const topCategory = expenseCategoryStats.value[0]
  const majorPart = topCategory ? `主要支出集中在${topCategory.name}` : "本月暂无明显支出分类"

  if (!monthlyExpense.value) {
    return `${monthLabel.value} 暂无支出记录，预算仍保持充足，可以先开始记一笔账。`
  }

  const comparePart =
    previousExpense > 0
      ? `${monthLabel.value}支出比上月${direction}${ratio}%`
      : `${monthLabel.value}支出为本周期首次统计值`

  const budgetPart = isOverBudget.value
    ? `，已超预算 ${formatAmount(overBudgetAmount.value)} 元。`
    : `，预算内还剩 ${formatAmount(remainingBudget.value)} 元。`

  return `${comparePart}，${majorPart}${budgetPart}`
})

const pieOption = computed(() => {
  const data = expenseCategoryStats.value.map((item) => ({
    value: Number(item.value.toFixed(2)),
    name: item.name,
    itemStyle: {
      color: item.color
    }
  }))

  return {
    tooltip: {
      trigger: "item",
      formatter: "{b}<br/>¥{c} ({d}%)"
    },
    legend: {
      bottom: 0,
      type: "scroll",
      icon: "circle",
      textStyle: {
        color: "#4B5563",
        fontSize: 12
      }
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: false,
        label: {
          show: true,
          formatter: "{b}\n¥{c}",
          fontSize: 11
        },
        data
      }
    ]
  }
})

const lineOption = computed(() => {
  const xAxisData = dailyTrend.value.map((item) => `${item.day}`)
  const seriesData = dailyTrend.value.map((item) => ({
    value: Number(item.value.toFixed(2)),
    itemStyle: item.overBudget
      ? {
          color: "#E74C3C"
        }
      : undefined,
    symbolSize: item.overBudget ? 10 : 6
  }))

  return {
    tooltip: {
      trigger: "axis"
    },
    grid: {
      left: 36,
      right: 16,
      top: 30,
      bottom: 30,
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: xAxisData,
      boundaryGap: false,
      axisLabel: {
        color: "#6B7280",
        fontSize: 11
      }
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#6B7280",
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: "#E5E7EB"
        }
      }
    },
    series: [
      {
        type: "line",
        smooth: true,
        data: seriesData,
        lineStyle: {
          color: "#2B7A4B",
          width: 3
        },
        areaStyle: {
          color: "rgba(43, 122, 75, 0.15)"
        },
        markPoint: {
          symbol: "circle",
          symbolSize: 12,
          itemStyle: {
            color: "#E74C3C"
          },
          data: dailyTrend.value
            .filter((item) => item.overBudget)
            .map((item) => ({
              coord: [`${item.day}`, Number(item.value.toFixed(2))]
            }))
        }
      }
    ]
  }
})

const barOption = computed(() => {
  return {
    tooltip: {
      trigger: "axis"
    },
    grid: {
      left: 30,
      right: 12,
      top: 28,
      bottom: 24,
      containLabel: true
    },
    xAxis: {
      type: "category",
      data: recentSixMonths.value.map((item) => item.label),
      axisLabel: {
        color: "#6B7280",
        fontSize: 11
      }
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "#6B7280",
        fontSize: 11
      },
      splitLine: {
        lineStyle: {
          color: "#E5E7EB"
        }
      }
    },
    series: [
      {
        type: "bar",
        barWidth: 22,
        data: recentSixMonths.value.map((item, index) => ({
          value: item.value,
          itemStyle: {
            color: index === recentSixMonths.value.length - 1 ? "#2B7A4B" : "#9CC9AC"
          }
        }))
      }
    ]
  }
})

function formatAmount(value) {
  return Number(value || 0).toFixed(2)
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function shiftMonth(monthKey, offset) {
  const [year, month] = monthKey.split("-").map(Number)
  const date = new Date(year, month - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function changeMonth(offset) {
  selectedMonth.value = shiftMonth(selectedMonth.value, offset)
}

function handleMonthPick(event) {
  const value = String(event.detail.value || "").slice(0, 7)
  if (!value) {
    return
  }
  selectedMonth.value = value
}

function backToCurrentMonth() {
  selectedMonth.value = getCurrentMonth()
}

function loadStatisticsData() {
  currentUser.value = getCurrentUser() || ""
  if (!currentUser.value) {
    uni.reLaunch({
      url: "/pages/login/login"
    })
    return
  }

  const userData = getCurrentUserData()
  transactions.value = userData?.transactions || []
  expenseTags.value = userData?.expenseTags || []
  incomeItems.value = userData?.incomeItems || []
  fixedExpenseItems.value = userData?.fixedExpenseItems || []
}

function handlePieClick(params) {
  if (!params?.name) {
    return
  }

  const target = expenseCategoryStats.value.find((item) => item.name === params.name)
  if (!target) {
    return
  }

  detailPopup.title = target.name
  detailPopup.records = [...target.records].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  detailPopup.filter.tagId = target.key.startsWith("fixed_") ? "" : target.key === "uncategorized" ? "" : target.key
  detailPopup.filter.tagName = target.key.startsWith("fixed_") ? "" : target.name
  detailPopup.filter.fixedExpenseItemId = target.key.startsWith("fixed_") ? target.key.replace("fixed_", "") : ""
  detailPopup.filter.fixedExpenseName = target.key.startsWith("fixed_") ? target.name : ""
  detailPopup.visible = true
}

function closeDetailPopup() {
  detailPopup.visible = false
  detailPopup.title = ""
  detailPopup.records = []
  detailPopup.filter.tagId = ""
  detailPopup.filter.tagName = ""
  detailPopup.filter.fixedExpenseItemId = ""
  detailPopup.filter.fixedExpenseName = ""
}

function goToTransactionDetail(item) {
  setStorageSync(RECORD_FILTER_CACHE_KEY, {
    month: selectedMonth.value,
    day: item?.date || `${selectedMonth.value}-01`,
    type: "expense",
    tagId: detailPopup.filter.tagId,
    tagName: detailPopup.filter.tagName,
    fixedExpenseItemId: detailPopup.filter.fixedExpenseItemId,
    fixedExpenseName: detailPopup.filter.fixedExpenseName
  })
  closeDetailPopup()
  uni.switchTab({
    url: "/pages/record/record"
  })
}

onShow(() => {
  if (!selectedMonth.value) {
    selectedMonth.value = getCurrentMonth()
  }

  budgetStore.refreshBudget()
  loadStatisticsData()
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

.hero-card,
.summary-card,
.budget-card,
.chart-card,
.insight-card,
.modal-card {
  padding: 28rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20rpx 50rpx rgba(31, 41, 51, 0.08);
}

.month-switcher {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
}

.month-center {
  flex: 1;
  text-align: center;
}

.month-picker {
  flex: 1;
}

.switch-arrow {
  width: 64rpx;
  height: 64rpx;
  line-height: 60rpx;
  text-align: center;
  border-radius: 18rpx;
  background: #eef5f0;
  color: var(--color-primary);
  font-size: 42rpx;
}

.hero-kicker {
  display: block;
  font-size: 24rpx;
  color: var(--color-primary);
  letter-spacing: 4rpx;
}

.hero-title {
  display: block;
  margin-top: 8rpx;
  font-size: 46rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-desc,
.budget-desc,
.budget-note,
.budget-warning,
.card-desc,
.summary-label,
.insight-text,
.detail-note,
.detail-time {
  display: block;
  margin-top: 10rpx;
  font-size: 25rpx;
  color: var(--text-secondary);
  line-height: 1.7;
}

.back-btn {
  margin-top: 12rpx;
  border-radius: 999rpx;
  background: var(--color-primary);
  color: #fff;
}

.summary-card,
.budget-card,
.chart-card,
.insight-card {
  margin-top: 24rpx;
}

.summary-card {
  display: flex;
  gap: 18rpx;
}

.summary-item {
  flex: 1;
}

.summary-value {
  display: block;
  margin-top: 14rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.summary-value.income {
  color: var(--color-primary);
}

.summary-value.expense {
  color: var(--color-danger);
}

.budget-head,
.card-head,
.modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
}

.budget-title,
.card-title,
.insight-title,
.modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.budget-rate {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--color-primary);
}

.budget-rate.warning,
.budget-warning {
  color: var(--color-danger);
}

.progress-track {
  margin-top: 24rpx;
  width: 100%;
  height: 22rpx;
  border-radius: 999rpx;
  background: #e9f2ec;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: var(--color-primary);
}

.progress-fill.warning {
  background: var(--color-danger);
}

.chart {
  width: 100%;
  height: 520rpx;
  margin-top: 18rpx;
}

.insight-text {
  margin-top: 14rpx;
  color: var(--text-primary);
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.38);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 24rpx;
  z-index: 30;
}

.modal-card {
  width: 100%;
  max-width: 720rpx;
  max-height: 70vh;
}

.modal-close {
  font-size: 44rpx;
  line-height: 1;
  color: var(--text-secondary);
}

.detail-list {
  margin-top: 20rpx;
  max-height: 52vh;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 51, 0.08);
}

.detail-item.clickable {
  position: relative;
}

.detail-item.clickable::after {
  content: "›";
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-primary);
  font-size: 32rpx;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-main {
  flex: 1;
  padding-right: 28rpx;
}

.detail-name {
  display: block;
  font-size: 30rpx;
  color: var(--text-primary);
}

.detail-side {
  text-align: right;
}

.detail-amount {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: var(--color-danger);
}

.empty-state {
  margin-top: 22rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: #f7faf8;
  color: var(--text-secondary);
  font-size: 26rpx;
  text-align: center;
}
</style>
