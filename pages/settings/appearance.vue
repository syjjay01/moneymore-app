<template>
  <view class="page">
    <view class="section-card">
      <view class="section-head">
        <text class="section-title">主题模式</text>
        <text class="section-desc">切换后立即全局生效</text>
      </view>

      <radio-group @change="handleThemeChange">
        <label v-for="item in themeOptions" :key="item.value" class="radio-item">
          <view class="radio-main">
            <text class="radio-title">{{ item.label }}</text>
            <text class="radio-desc">{{ item.desc }}</text>
          </view>
          <radio :value="item.value" :checked="draft.theme === item.value" color="#2B7A4B" />
        </label>
      </radio-group>
    </view>

    <view class="section-card">
      <view class="section-head">
        <text class="section-title">字体大小</text>
        <text class="section-desc">切换后立即全局生效</text>
      </view>

      <view class="font-size-row">
        <button
          v-for="item in fontOptions"
          :key="item.value"
          class="size-btn"
          :class="{ active: draft.fontSize === item.value }"
          @click="setFontSize(item.value)"
        >
          {{ item.label }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { useAppearance } from "../../composables/useAppearance"
import { getCurrentUser, getCurrentUserSettings } from "../../utils/storage"

const { saveAndApplyAppearance, applyAppearance } = useAppearance()
const draft = reactive({
  theme: "fresh",
  fontSize: "medium"
})

const themeOptions = [
  { value: "fresh", label: "清新绿", desc: "自然轻盈，适合日常记账" },
  { value: "ocean", label: "海岸蓝", desc: "克制清晰，适合统计浏览" },
  { value: "night", label: "夜幕黑", desc: "低亮护眼，适合夜间使用" }
]

const fontOptions = [
  { value: "small", label: "小" },
  { value: "medium", label: "中" },
  { value: "large", label: "大" }
]

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function syncFromStorage() {
  const currentUser = getCurrentUser()
  if (!currentUser) {
    uni.reLaunch({
      url: "/pages/login/login"
    })
    return
  }

  const settings = getCurrentUserSettings()
  draft.theme = settings.theme || "fresh"
  draft.fontSize = settings.fontSize || "medium"
  applyAppearance(draft.theme, draft.fontSize)
}

function persistAppearance(nextTheme, nextFontSize) {
  const saved = saveAndApplyAppearance(nextTheme, nextFontSize)
  if (!saved) {
    showToast("设置失败，请稍后重试")
    return false
  }
  draft.theme = nextTheme
  draft.fontSize = nextFontSize
  return true
}

function handleThemeChange(event) {
  const nextTheme = event.detail.value || "fresh"
  persistAppearance(nextTheme, draft.fontSize)
}

function setFontSize(size) {
  persistAppearance(draft.theme, size)
}

onShow(() => {
  syncFromStorage()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: var(--app-page-gradient);
}

.section-card {
  margin-bottom: 24rpx;
  padding: 30rpx 26rpx;
  border-radius: 24rpx;
  background: var(--bg-card);
  box-shadow: 0 16rpx 42rpx rgba(31, 41, 51, 0.08);
}

.section-head {
  margin-bottom: 18rpx;
}

.section-title {
  display: block;
  font-size: calc(34rpx * var(--font-size-multiplier));
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  display: block;
  margin-top: 8rpx;
  font-size: calc(24rpx * var(--font-size-multiplier));
  color: var(--text-secondary);
}

.radio-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  padding: 22rpx;
  border-radius: 18rpx;
  background: rgba(43, 122, 75, 0.08);
}

.radio-item + .radio-item {
  margin-top: 12rpx;
}

.radio-main {
  display: flex;
  flex-direction: column;
}

.radio-title {
  font-size: calc(30rpx * var(--font-size-multiplier));
  color: var(--text-primary);
}

.radio-desc {
  margin-top: 6rpx;
  font-size: calc(24rpx * var(--font-size-multiplier));
  color: var(--text-secondary);
}

.font-size-row {
  display: flex;
  gap: 14rpx;
}

.size-btn {
  flex: 1;
  height: 82rpx;
  border-radius: 16rpx;
  background: rgba(148, 163, 184, 0.14);
  color: var(--text-secondary);
  font-size: calc(28rpx * var(--font-size-multiplier));
}

.size-btn.active {
  background: rgba(43, 122, 75, 0.16);
  color: var(--color-primary);
  border: 2rpx solid rgba(43, 122, 75, 0.3);
}
</style>
