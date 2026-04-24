<template>
  <view class="page">
    <view class="hero-card">
      <text class="hero-kicker">外观方案</text>
      <text class="hero-title">切换钱多多的界面气质</text>
      <text class="hero-desc">保留两套主题，切换后立即全局生效。</text>
    </view>

    <view class="section-card">
      <view class="section-head">
        <text class="section-title">主题风格</text>
        <text class="section-desc">A 更极简清新，B 更柔和立体。</text>
      </view>

      <radio-group @change="handleThemeChange">
        <label v-for="item in themeOptions" :key="item.value" class="theme-card">
          <view class="theme-preview" :class="`preview-${item.value}`">
            <view class="preview-shell">
              <view class="preview-bar" />
              <view class="preview-card preview-card-main" />
              <view class="preview-row">
                <view class="preview-card preview-card-small" />
                <view class="preview-card preview-card-small" />
              </view>
            </view>
          </view>

          <view class="theme-main">
            <text class="theme-title">{{ item.label }}</text>
            <text class="theme-desc">{{ item.desc }}</text>
          </view>

          <radio :value="item.value" :checked="draft.theme === item.value" color="#32936F" />
        </label>
      </radio-group>
    </view>

    <view class="section-card">
      <view class="section-head">
        <text class="section-title">字体大小</text>
        <text class="section-desc">切换后当前页和全局页面同步变化。</text>
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
  {
    value: "fresh",
    label: "A 极简清新",
    desc: "留白更轻，薄雾绿更干净，适合专注记账。"
  },
  {
    value: "ocean",
    label: "B 轻拟物清新",
    desc: "层次更柔和，浅蓝浮雕感更明显，界面更有包裹感。"
  }
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
  draft.theme = ["fresh", "ocean"].includes(settings.theme) ? settings.theme : "fresh"
  draft.fontSize = ["small", "medium", "large"].includes(settings.fontSize) ? settings.fontSize : "medium"
  applyAppearance(draft.theme, draft.fontSize)
}

function persistAppearance(nextTheme, nextFontSize) {
  const saved = saveAndApplyAppearance(nextTheme, nextFontSize)
  if (!saved) {
    showToast("设置应用失败，请稍后重试")
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

.hero-card,
.section-card {
  border-radius: 28rpx;
  background: var(--bg-card);
  box-shadow: var(--shadow-card);
  border: 1rpx solid var(--line-soft);
}

.hero-card {
  padding: 30rpx 28rpx;
}

.hero-kicker {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(50, 147, 111, 0.12);
  color: var(--color-primary);
  font-size: var(--font-size-base);
}

.hero-title {
  display: block;
  margin-top: 18rpx;
  font-size: 42rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.hero-desc,
.section-desc,
.theme-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
  line-height: 1.7;
}

.section-card {
  margin-top: 24rpx;
  padding: 30rpx 26rpx;
}

.section-head {
  margin-bottom: 16rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.theme-card {
  display: flex;
  align-items: center;
  gap: 18rpx;
  padding: 20rpx;
  border-radius: 22rpx;
  background: var(--bg-soft);
}

.theme-card + .theme-card {
  margin-top: 14rpx;
}

.theme-preview {
  width: 132rpx;
  height: 132rpx;
  border-radius: 24rpx;
  padding: 10rpx;
  box-sizing: border-box;
  flex-shrink: 0;
}

.preview-fresh {
  background: linear-gradient(180deg, #f6fcf9 0%, #eef7f2 100%);
}

.preview-ocean {
  background: linear-gradient(180deg, #f8f9fe 0%, #eef2fb 100%);
}

.preview-shell {
  width: 100%;
  height: 100%;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.88);
  padding: 12rpx;
  box-sizing: border-box;
}

.preview-bar {
  height: 16rpx;
  border-radius: 999rpx;
  background: rgba(50, 147, 111, 0.35);
}

.preview-ocean .preview-bar {
  background: rgba(109, 132, 190, 0.38);
}

.preview-card {
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.94);
}

.preview-card-main {
  height: 38rpx;
  margin-top: 12rpx;
  box-shadow: 0 8rpx 18rpx rgba(72, 98, 120, 0.08);
}

.preview-row {
  display: flex;
  gap: 8rpx;
  margin-top: 10rpx;
}

.preview-card-small {
  flex: 1;
  height: 26rpx;
  box-shadow: 0 8rpx 18rpx rgba(72, 98, 120, 0.08);
}

.theme-main {
  flex: 1;
}

.theme-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.font-size-row {
  display: flex;
  gap: 14rpx;
}

.size-btn {
  flex: 1;
  height: 82rpx;
  border-radius: 18rpx;
  background: var(--bg-soft);
  color: var(--text-secondary);
  font-size: 28rpx;
  border: 1rpx solid transparent;
}

.size-btn.active {
  background: rgba(50, 147, 111, 0.14);
  color: var(--color-primary);
  border-color: rgba(50, 147, 111, 0.22);
}
</style>
