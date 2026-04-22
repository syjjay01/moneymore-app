<template>
  <view class="page">
    <view class="section-card">
      <view class="section-head">
        <text class="section-title">主题模式</text>
        <text class="section-desc">可选择浅色、深色或跟随系统</text>
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
        <text class="section-desc">设置全局字号缩放比例</text>
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

      <view class="preview-box">
        <text class="preview-title">预览</text>
        <text class="preview-text">钱多多帮助你更清晰地掌握每月财务状况。</text>
      </view>
    </view>

    <button class="primary-btn" :loading="saving" @click="saveAppearance">保存设置</button>
  </view>
</template>

<script setup>
import { reactive, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { useAppearance } from "../../composables/useAppearance"
import { getCurrentUser, getCurrentUserSettings } from "../../utils/storage"

const { applyAppearance, saveAndApplyAppearance } = useAppearance()
const saving = ref(false)
const draft = reactive({
  theme: "system",
  fontSize: "medium"
})

const themeOptions = [
  { value: "light", label: "浅色", desc: "始终使用浅色界面" },
  { value: "dark", label: "深色", desc: "始终使用深色界面" },
  { value: "system", label: "跟随系统", desc: "自动匹配系统外观" }
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
  draft.theme = settings.theme || "system"
  draft.fontSize = settings.fontSize || "medium"
  applyAppearance(draft.theme, draft.fontSize)
}

function handleThemeChange(event) {
  draft.theme = event.detail.value || "system"
  applyAppearance(draft.theme, draft.fontSize)
}

function setFontSize(size) {
  draft.fontSize = size
  applyAppearance(draft.theme, draft.fontSize)
}

function saveAppearance() {
  if (saving.value) {
    return
  }

  saving.value = true
  const saved = saveAndApplyAppearance(draft.theme, draft.fontSize)
  saving.value = false

  if (!saved) {
    showToast("保存失败，请稍后重试")
    return
  }

  uni.showToast({
    title: "外观设置已保存",
    icon: "success"
  })
}

onShow(() => {
  syncFromStorage()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background:
    radial-gradient(circle at top left, rgba(43, 122, 75, 0.14), transparent 30%),
    linear-gradient(180deg, #f3f8f4 0%, #f8f9fa 38%, #f8f9fa 100%);
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
  background: rgba(43, 122, 75, 0.07);
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
  background: #f5f8f6;
  color: var(--text-secondary);
  font-size: calc(28rpx * var(--font-size-multiplier));
}

.size-btn.active {
  background: rgba(43, 122, 75, 0.16);
  color: var(--color-primary);
  border: 2rpx solid rgba(43, 122, 75, 0.28);
}

.preview-box {
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: rgba(43, 122, 75, 0.06);
}

.preview-title {
  display: block;
  font-size: calc(26rpx * var(--font-size-multiplier));
  color: var(--text-secondary);
}

.preview-text {
  display: block;
  margin-top: 8rpx;
  font-size: calc(30rpx * var(--font-size-multiplier));
  color: var(--text-primary);
}

.primary-btn {
  border-radius: 18rpx;
  background: var(--color-primary);
  color: #fff;
  font-size: calc(30rpx * var(--font-size-multiplier));
}
</style>
