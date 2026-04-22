import { computed, ref } from "vue"
import { defineStore } from "pinia"
import { getCurrentUser, getCurrentUserData } from "../utils/storage"

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export const useBudgetStore = defineStore("budget", () => {
  const username = ref("")
  const monthlyBudget = ref(5000)
  const monthlyExpense = ref(0)
  const monthKey = ref(getCurrentMonth())

  const overBudgetAmount = computed(() => {
    return Math.max(0, Number((monthlyExpense.value - monthlyBudget.value).toFixed(2)))
  })

  const budgetProgress = computed(() => {
    if (!monthlyBudget.value) {
      return monthlyExpense.value > 0 ? 100 : 0
    }

    return Math.min(100, Number(((monthlyExpense.value / monthlyBudget.value) * 100).toFixed(2)))
  })

  const isOverBudget = computed(() => overBudgetAmount.value > 0)

  function refreshBudget() {
    username.value = getCurrentUser() || ""
    monthKey.value = getCurrentMonth()

    if (!username.value) {
      monthlyBudget.value = 5000
      monthlyExpense.value = 0
      return
    }

    const userData = getCurrentUserData()
    const settings = userData?.settings || {}
    const budgetValue = Number(settings.monthly_budget ?? settings.monthlyBudget ?? 5000)

    monthlyBudget.value = Number.isNaN(budgetValue) ? 5000 : budgetValue
    monthlyExpense.value = (userData?.transactions || []).reduce((total, item) => {
      const isCurrentMonth = String(item.date || "").slice(0, 7) === monthKey.value
      const isExpense = item.type === "expense"
      if (!isCurrentMonth || !isExpense) {
        return total
      }

      return total + Number(item.amount || 0)
    }, 0)
  }

  return {
    username,
    monthKey,
    monthlyBudget,
    monthlyExpense,
    overBudgetAmount,
    budgetProgress,
    isOverBudget,
    refreshBudget
  }
})
