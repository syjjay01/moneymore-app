<template>
  <view class="page">
    <view class="hero-card">
      <text class="hero-kicker">固定支出管理</text>
      <text class="hero-title">管理每月固定项目</text>
      <text class="hero-desc">仅维护项目名称，不维护金额；历史流水会保留。</text>
    </view>

    <view class="form-card">
      <text class="section-title">{{ editingId ? "编辑固定支出项" : "新增固定支出项" }}</text>

      <view class="field">
        <text class="label">名称</text>
        <input v-model.trim="form.name" class="input" maxlength="20" placeholder="例如：车位费、保险、房租" />
      </view>

      <view class="action-row">
        <button class="primary-btn" @click="handleSubmit">{{ editingId ? "保存修改" : "新增固定支出项" }}</button>
        <button v-if="editingId" class="ghost-btn" @click="resetForm">取消编辑</button>
      </view>
    </view>

    <view class="list-card">
      <view class="list-head">
        <text class="section-title">当前固定支出项</text>
        <text class="section-desc">共 {{ items.length }} 项</text>
      </view>

      <view v-if="items.length" class="list-wrap">
        <view v-for="item in items" :key="item.id" class="list-item">
          <view class="item-main">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-meta">{{ item.isSystem ? "系统项" : "自定义项" }}</text>
          </view>
          <view class="item-actions">
            <text class="link-btn" @click="startEdit(item)">编辑</text>
            <text class="danger-link" @click="removeItem(item)">删除</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">暂无固定支出项，请先新增一项。</view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { getCurrentUser, getCurrentUserData, replaceUserCollection } from "../../utils/storage"

const systemFixedExpenseIds = ["fixed_mortgage", "fixed_support", "fixed_utilities", "fixed_property", "fixed_network", "fixed_education"]

const currentUser = ref("")
const items = ref([])
const editingId = ref("")
const form = reactive({
  name: ""
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

function normalizeItem(item) {
  return {
    id: item.id,
    name: item.name || "未命名固定支出",
    isSystem: typeof item.isSystem === "boolean" ? item.isSystem : systemFixedExpenseIds.includes(item.id)
  }
}

function loadItems() {
  currentUser.value = getCurrentUser() || ""
  if (!currentUser.value) {
    uni.reLaunch({
      url: "/pages/login/login"
    })
    return
  }

  const userData = getCurrentUserData()
  items.value = (userData?.fixedExpenseItems || []).map(normalizeItem)
}

function resetForm() {
  editingId.value = ""
  form.name = ""
}

function persist(nextList, successText) {
  const saved = replaceUserCollection(currentUser.value, "fixedExpenseItems", nextList)
  if (!saved) {
    showToast("保存失败，请稍后重试")
    return
  }

  items.value = nextList
  resetForm()
  uni.showToast({
    title: successText,
    icon: "success"
  })
}

function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    showToast("请输入固定支出项名称")
    return
  }

  const duplicated = items.value.some((item) => item.name === name && item.id !== editingId.value)
  if (duplicated) {
    showToast("固定支出项名称已存在")
    return
  }

  const nextItem = {
    name
  }

  if (editingId.value) {
    persist(
      items.value.map((item) => (item.id === editingId.value ? { ...item, ...nextItem } : item)),
      "固定支出项已更新"
    )
    return
  }

  persist(
    [...items.value, { id: createId("fixed_item"), isSystem: false, ...nextItem }],
    "固定支出项已新增"
  )
}

function startEdit(item) {
  editingId.value = item.id
  form.name = item.name
}

function removeItem(item) {
  uni.showModal({
    title: "删除固定支出项",
    content: `确认删除“${item.name}”吗？历史流水记录不会自动删除。`,
    confirmColor: "#E74C3C",
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      persist(
        items.value.filter((current) => current.id !== item.id),
        "固定支出项已删除"
      )
    }
  })
}

onShow(() => {
  loadItems()
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

.empty-state {
  margin-top: 22rpx;
  padding: 28rpx 24rpx;
  border-radius: 20rpx;
  background: #f7faf8;
  color: var(--text-secondary);
  font-size: 26rpx;
}
</style>
