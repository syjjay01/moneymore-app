<template>
  <view class="page">
    <view class="hero-card">
      <text class="hero-kicker">标签管理</text>
      <text class="hero-title">维护日常支出标签</text>
      <text class="hero-desc">系统内置的 7 个标签不可删除，但可以修改名称、emoji 和颜色。</text>
    </view>

    <view class="form-card">
      <text class="section-title">{{ editingId ? "编辑标签" : "新增标签" }}</text>

      <view class="field">
        <text class="label">名称</text>
        <input v-model.trim="form.name" class="input" maxlength="12" placeholder="例如：咖啡、宠物、健身" />
      </view>

      <view class="field">
        <text class="label">Emoji</text>
        <view class="picker-grid">
          <text
            v-for="emoji in emojiOptions"
            :key="emoji"
            class="picker-chip emoji-chip"
            :class="{ active: form.emoji === emoji }"
            @click="form.emoji = emoji"
          >
            {{ emoji }}
          </text>
        </view>
      </view>

      <view class="field">
        <text class="label">颜色</text>
        <view class="picker-grid">
          <view
            v-for="color in colorOptions"
            :key="color"
            class="color-chip"
            :class="{ active: form.color === color }"
            :style="{ backgroundColor: color }"
            @click="form.color = color"
          />
        </view>
      </view>

      <view class="action-row">
        <button class="primary-btn" @click="handleSubmit">{{ editingId ? "保存修改" : "新增标签" }}</button>
        <button v-if="editingId" class="ghost-btn" @click="resetForm">取消编辑</button>
      </view>
    </view>

    <view class="list-card">
      <view class="list-head">
        <text class="section-title">当前标签</text>
        <text class="section-desc">共 {{ tags.length }} 项</text>
      </view>

      <view v-if="tags.length" class="list-wrap">
        <view v-for="item in tags" :key="item.id" class="list-item">
          <view class="item-main">
            <view class="tag-preview" :style="{ backgroundColor: item.color || '#2B7A4B' }">
              <text class="tag-emoji">{{ item.emoji || "🏷️" }}</text>
            </view>
            <view class="item-content">
              <text class="item-name">{{ item.name }}</text>
              <text class="item-meta">{{ item.isSystem ? "系统标签" : "自定义标签" }}</text>
            </view>
          </view>
          <view class="item-actions">
            <text class="link-btn" @click="startEdit(item)">编辑</text>
            <text
              class="danger-link"
              :class="{ disabled: item.isSystem }"
              @click="removeTag(item)"
            >
              删除
            </text>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">暂无标签，请先新增一个标签。</view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { getCurrentUser, getCurrentUserData, updateUserData } from "../../utils/storage"

const emojiOptions = ["🍜", "🥬", "🎮", "🍪", "🧻", "👟", "🚌", "☕", "🐾", "🏃", "🛒", "🎁", "📚", "🏥", "🏠"]
const colorOptions = ["#2B7A4B", "#E67E22", "#E74C3C", "#3498DB", "#8E44AD", "#16A085", "#D35400", "#2C3E50"]
const systemTagIds = ["tag_food", "tag_grocery", "tag_fun", "tag_snack", "tag_household", "tag_clothes", "tag_transport"]
const uncategorizedTagId = "tag_uncategorized"

const currentUser = ref("")
const tags = ref([])
const editingId = ref("")
const form = reactive({
  name: "",
  emoji: "🏷️",
  color: "#2B7A4B"
})

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function normalizeTag(item) {
  return {
    id: item.id,
    name: item.name || "未命名标签",
    emoji: item.emoji || "🏷️",
    color: item.color || "#2B7A4B",
    isSystem: typeof item.isSystem === "boolean" ? item.isSystem : systemTagIds.includes(item.id)
  }
}

function ensureUncategorized(list) {
  const existing = list.find((item) => item.id === uncategorizedTagId)
  if (existing) {
    return list
  }

  return [
    ...list,
    {
      id: uncategorizedTagId,
      name: "未分类",
      emoji: "📦",
      color: "#7F8C8D",
      isSystem: true
    }
  ]
}

function loadTags() {
  currentUser.value = getCurrentUser() || ""
  if (!currentUser.value) {
    uni.reLaunch({
      url: "/pages/login/login"
    })
    return
  }

  const userData = getCurrentUserData()
  const currentTags = userData?.expenseTags || []
  tags.value = currentTags.map(normalizeTag)
}

function resetForm() {
  editingId.value = ""
  form.name = ""
  form.emoji = "🏷️"
  form.color = "#2B7A4B"
}

function persist(updater, successText) {
  const saved = updateUserData(currentUser.value, updater)
  if (!saved) {
    showToast("保存失败，请稍后重试")
    return
  }

  loadTags()
  resetForm()
  uni.showToast({
    title: successText,
    icon: "success"
  })
}

function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    showToast("请输入标签名称")
    return
  }

  const duplicated = tags.value.some((item) => item.name === name && item.id !== editingId.value)
  if (duplicated) {
    showToast("标签名称已存在")
    return
  }

  if (editingId.value) {
    persist(
      (userData) => ({
        ...userData,
        expenseTags: (userData.expenseTags || []).map((item) =>
          item.id === editingId.value
            ? {
                ...normalizeTag(item),
                name,
                emoji: form.emoji,
                color: form.color
              }
            : normalizeTag(item)
        )
      }),
      "标签已更新"
    )
    return
  }

  persist(
    (userData) => ({
      ...userData,
      expenseTags: [
        ...(userData.expenseTags || []).map(normalizeTag),
        {
          id: createId("tag"),
          name,
          emoji: form.emoji,
          color: form.color,
          isSystem: false
        }
      ]
    }),
    "标签已新增"
  )
}

function startEdit(item) {
  editingId.value = item.id
  form.name = item.name
  form.emoji = item.emoji || "🏷️"
  form.color = item.color || "#2B7A4B"
}

function removeTag(item) {
  if (item.isSystem) {
    showToast("系统内置标签不可删除")
    return
  }

  uni.showModal({
    title: "删除标签",
    content: `删除后，该标签下的支出记录将移至“未分类”标签，确认继续吗？`,
    confirmColor: "#E74C3C",
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      persist(
        (userData) => {
          const nextTags = ensureUncategorized((userData.expenseTags || []).map(normalizeTag))
            .filter((tag) => tag.id !== item.id)

          const nextTransactions = (userData.transactions || []).map((transaction) => {
            if (transaction.tagId !== item.id) {
              return transaction
            }

            return {
              ...transaction,
              tagId: uncategorizedTagId,
              updatedAt: Date.now()
            }
          })

          return {
            ...userData,
            expenseTags: nextTags,
            transactions: nextTransactions
          }
        },
        "标签已删除"
      )
    }
  })
}

onShow(() => {
  loadTags()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background:
    radial-gradient(circle at top left, rgba(43, 122, 75, 0.14), transparent 28%),
    linear-gradient(180deg, #f2f8f4 0%, #f8f9fa 36%, #f8f9fa 100%);
}

.hero-card,
.form-card,
.list-card {
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
.section-desc,
.item-meta {
  display: block;
  margin-top: 10rpx;
  font-size: 25rpx;
  color: var(--text-secondary);
  line-height: 1.7;
}

.form-card,
.list-card {
  margin-top: 24rpx;
}

.section-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.field {
  margin-top: 24rpx;
}

.label {
  display: block;
  margin-bottom: 12rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.input {
  height: 84rpx;
  padding: 0 22rpx;
  border: 2rpx solid rgba(43, 122, 75, 0.14);
  border-radius: 18rpx;
  background: #fff;
  font-size: 28rpx;
  color: var(--text-primary);
}

.picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.picker-chip,
.color-chip {
  border-radius: 18rpx;
  border: 2rpx solid transparent;
}

.emoji-chip {
  width: 88rpx;
  height: 88rpx;
  line-height: 84rpx;
  text-align: center;
  font-size: 38rpx;
  background: #f4f8f5;
}

.picker-chip.active,
.color-chip.active {
  border-color: var(--color-primary);
}

.color-chip {
  width: 88rpx;
  height: 88rpx;
}

.action-row {
  display: flex;
  gap: 18rpx;
  margin-top: 28rpx;
}

.action-row button {
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

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.list-wrap {
  margin-top: 20rpx;
}

.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid rgba(31, 41, 51, 0.08);
}

.list-item:last-child {
  border-bottom: none;
}

.item-main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.tag-preview {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tag-emoji {
  font-size: 34rpx;
}

.item-content {
  flex: 1;
}

.item-name {
  display: block;
  font-size: 30rpx;
  color: var(--text-primary);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.link-btn {
  color: var(--color-primary);
  font-size: 26rpx;
}

.danger-link {
  color: var(--color-danger);
  font-size: 26rpx;
}

.danger-link.disabled {
  color: #a8b0b8;
}

.empty-state {
  margin-top: 22rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: #f7faf8;
  color: var(--text-secondary);
  font-size: 26rpx;
}
</style>
