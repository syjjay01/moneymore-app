<template>
  <view class="page">
    <view class="hero-card">
      <text class="hero-kicker">预算设置</text>
      <text class="hero-title">设置每月支出上限</text>
      <text class="hero-desc">当前预算会用于记账页、流水页和统计页的超支预警。</text>
    </view>

    <view class="form-card">
      <view class="field">
        <text class="label">月度支出总预算</text>
        <input
          v-model="budgetValue"
          class="input"
          type="digit"
          placeholder="请输入预算金额"
        />
      </view>

      <text class="hint">默认预算为 5000 元，可随时调整。</text>

      <button class="primary-btn" @click="handleSave">保存预算</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { useBudgetStore } from "../../stores/budget"
import { getCurrentUser, getCurrentUserData, updateUserData } from "../../utils/storage"

const budgetStore = useBudgetStore()
const budgetValue = ref("")
const currentUser = ref("")

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function loadBudget() {
  currentUser.value = getCurrentUser() || ""
  if (!currentUser.value) {
    uni.reLaunch({
      url: "/pages/login/login"
    })
    return
  }

  const userData = getCurrentUserData()
  const settings = userData?.settings || {}
  budgetValue.value = String(settings.monthly_budget ?? settings.monthlyBudget ?? 5000)
}

function handleSave() {
  const parsed = Number(budgetValue.value)
  if (Number.isNaN(parsed) || parsed < 0) {
    showToast("请输入正确的预算金额")
    return
  }

  const saved = updateUserData(currentUser.value, (userData) => ({
    ...userData,
    settings: {
      ...(userData.settings || {}),
      monthly_budget: Number(parsed.toFixed(2)),
      monthlyBudget: Number(parsed.toFixed(2))
    }
  }))

  if (!saved) {
    showToast("保存失败，请稍后重试")
    return
  }

  budgetStore.refreshBudget()
  uni.showToast({
    title: "预算已保存",
    icon: "success"
  })
}

onShow(() => {
  loadBudget()
  budgetStore.refreshBudget()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background:
    radial-gradient(circle at top left, rgba(43, 122, 75, 0.14), transparent 28%),
    linear-gradient(180deg, #f3f8f4 0%, #f8f9fa 36%, #f8f9fa 100%);
}

.hero-card,
.form-card {
  padding: 28rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20rpx 50rpx rgba(31, 41, 51, 0.08);
}

.hero-kicker {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(43, 122, 75, 0.1);
  color: var(--color-primary);
  font-size: 24rpx;
}

.hero-title {
  display: block;
  margin-top: 18rpx;
  font-size: 46rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-desc,
.hint {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
  line-height: 1.7;
}

.form-card {
  margin-top: 24rpx;
}

.field {
  margin-top: 8rpx;
}

.label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.input {
  height: 92rpx;
  padding: 0 24rpx;
  border: 2rpx solid rgba(43, 122, 75, 0.14);
  border-radius: 20rpx;
  background: #fff;
  font-size: 30rpx;
  color: var(--text-primary);
}

.primary-btn {
  margin-top: 28rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  background: var(--color-primary);
  color: #fff;
}
</style>
