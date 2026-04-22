<template>
  <view class="page">
    <view class="hero-card">
      <text class="hero-kicker">收入项管理</text>
      <text class="hero-title">维护收入来源</text>
      <text class="hero-desc">支持新增、编辑和删除收入项，变更会直接保存到当前账号。</text>
    </view>

    <view class="form-card">
      <text class="section-title">{{ editingId ? "编辑收入项" : "新增收入项" }}</text>

      <view class="field">
        <text class="label">名称</text>
        <input v-model.trim="form.name" class="input" maxlength="20" placeholder="例如：奖金、兼职、理财" />
      </view>

      <view class="field">
        <text class="label">类型</text>
        <picker :range="typeOptions" :value="selectedTypeIndex" @change="handleTypeChange">
          <view class="picker-value">{{ selectedTypeLabel }}</view>
        </picker>
      </view>

      <view class="action-row">
        <button class="primary-btn" @click="handleSubmit">{{ editingId ? "保存修改" : "新增收入项" }}</button>
        <button v-if="editingId" class="ghost-btn" @click="resetForm">取消编辑</button>
      </view>
    </view>

    <view class="list-card">
      <view class="list-head">
        <text class="section-title">当前收入项</text>
        <text class="section-desc">共 {{ items.length }} 项</text>
      </view>

      <view v-if="items.length" class="list-wrap">
        <view v-for="item in items" :key="item.id" class="list-item">
          <view class="item-main">
            <text class="item-name">{{ item.name }}</text>
            <text class="item-meta">{{ getTypeLabel(item.type) }}</text>
          </view>
          <view class="item-actions">
            <text class="link-btn" @click="startEdit(item)">编辑</text>
            <text class="danger-link" @click="removeItem(item)">删除</text>
          </view>
        </view>
      </view>
      <view v-else class="empty-state">暂无收入项，先新增一项吧。</view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { getCurrentUser, getCurrentUserData, replaceUserCollection } from "../../utils/storage"

const currentUser = ref("")
const items = ref([])
const editingId = ref("")
const typeOptions = ["固定收入", "波动收入", "其他"]
const typeValueMap = {
  固定收入: "fixed",
  波动收入: "variable",
  其他: "other"
}
const reverseTypeMap = {
  fixed: "固定收入",
  variable: "波动收入",
  other: "其他"
}

const form = reactive({
  name: "",
  type: "fixed"
})

const selectedTypeIndex = computed(() => {
  const label = reverseTypeMap[form.type] || "固定收入"
  const index = typeOptions.indexOf(label)
  return index > -1 ? index : 0
})

const selectedTypeLabel = computed(() => reverseTypeMap[form.type] || "固定收入")

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getTypeLabel(type) {
  return reverseTypeMap[type] || "其他"
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
  items.value = userData?.incomeItems || []
}

function handleTypeChange(event) {
  const index = Number(event.detail.value)
  const label = typeOptions[index] || typeOptions[0]
  form.type = typeValueMap[label]
}

function resetForm() {
  form.name = ""
  form.type = "fixed"
  editingId.value = ""
}

function persistItems(nextList, successText) {
  const saved = replaceUserCollection(currentUser.value, "incomeItems", nextList)
  if (!saved) {
    showToast("保存失败，请稍后重试")
    return false
  }

  items.value = nextList
  resetForm()
  uni.showToast({
    title: successText,
    icon: "success"
  })
  return true
}

function handleSubmit() {
  const name = form.name.trim()
  if (!name) {
    showToast("请输入收入项名称")
    return
  }

  const duplicated = items.value.some((item) => item.name === name && item.id !== editingId.value)
  if (duplicated) {
    showToast("收入项名称已存在")
    return
  }

  let nextList = []
  if (editingId.value) {
    nextList = items.value.map((item) =>
      item.id === editingId.value
        ? { ...item, name, type: form.type }
        : item
    )
    persistItems(nextList, "收入项已更新")
    return
  }

  nextList = [
    ...items.value,
    {
      id: createId("income_item"),
      name,
      type: form.type,
      autoRecord: false
    }
  ]
  persistItems(nextList, "收入项已新增")
}

function startEdit(item) {
  editingId.value = item.id
  form.name = item.name
  form.type = item.type || "fixed"
}

function removeItem(item) {
  uni.showModal({
    title: "删除收入项",
    content: `确认删除“${item.name}”吗？已保存的历史流水不会被自动删除。`,
    confirmColor: "#E74C3C",
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      const nextList = items.value.filter((current) => current.id !== item.id)
      persistItems(nextList, "收入项已删除")
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
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 20rpx 50rpx rgba(31, 41, 51, 0.08);
}

.hero-card,
.form-card,
.list-card {
  padding: 28rpx;
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

.input,
.picker-value {
  height: 84rpx;
  padding: 0 22rpx;
  border: 2rpx solid rgba(43, 122, 75, 0.14);
  border-radius: 18rpx;
  background: #fff;
  font-size: 28rpx;
  color: var(--text-primary);
}

.picker-value {
  display: flex;
  align-items: center;
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
  font-size: 30rpx;
  color: var(--text-primary);
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 24rpx;
  white-space: nowrap;
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
