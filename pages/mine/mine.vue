<template>
  <view class="page">
    <view class="hero-card">
      <text class="eyebrow">当前账号</text>
      <text class="username">{{ currentUser || "未登录" }}</text>
      <text class="tips">账号数据仅保存在本地设备，退出不会删除账本内容。</text>

      <view class="action-row">
        <button class="outline-btn" @click="handleLogout">退出登录</button>
        <button class="danger-btn" @click="handleDeleteAccount">注销账号</button>
      </view>
    </view>

    <view class="section-card">
      <view class="section-head">
        <text class="section-title">账本管理</text>
        <text class="section-desc">管理标签、收入项和固定支出项。</text>
      </view>

      <view class="nav-list">
        <view class="nav-item" @click="goTo('/pages/tag/tag-management')">
          <view>
            <text class="nav-title">标签管理</text>
            <text class="nav-desc">管理日常支出标签、emoji 和颜色</text>
          </view>
          <text class="nav-arrow">›</text>
        </view>

        <view class="nav-item" @click="goTo('/pages/income/income-management')">
          <view>
            <text class="nav-title">收入项管理</text>
            <text class="nav-desc">维护收入类型、默认金额和自动记账</text>
          </view>
          <text class="nav-arrow">›</text>
        </view>

        <view class="nav-item" @click="goTo('/pages/fixed-expense/fixed-expense-management')">
          <view>
            <text class="nav-title">固定支出管理</text>
            <text class="nav-desc">维护固定支出项目、默认金额和自动记账</text>
          </view>
          <text class="nav-arrow">›</text>
        </view>

        <view class="nav-item" @click="goTo('/pages/budget/budget-setting')">
          <view>
            <text class="nav-title">预算设置</text>
            <text class="nav-desc">设置月度支出总预算和超支预警阈值</text>
          </view>
          <text class="nav-arrow">›</text>
        </view>

        <view class="nav-item" @click="goTo('/pages/settings/appearance')">
          <view>
            <text class="nav-title">外观设置</text>
            <text class="nav-desc">切换主题风格并调整字体大小</text>
          </view>
          <text class="nav-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="section-card">
      <view class="section-head">
        <text class="section-title">账号安全</text>
        <text class="section-desc">密码修改采用弹窗填写，避免页面过长。</text>
      </view>
      <button class="primary-btn" @click="openPasswordModal">修改密码</button>
    </view>

    <view v-if="showPasswordModal" class="modal-mask" @click="closePasswordModal">
      <view class="modal-card" @click.stop>
        <view class="modal-head">
          <text class="modal-title">修改密码</text>
          <text class="modal-close" @click="closePasswordModal">×</text>
        </view>

        <view class="field">
          <text class="label">旧密码</text>
          <input
            v-model="passwordForm.oldPassword"
            class="input"
            type="password"
            maxlength="20"
            placeholder="请输入当前密码"
          />
        </view>

        <view class="field">
          <text class="label">新密码</text>
          <input
            v-model="passwordForm.newPassword"
            class="input"
            type="password"
            maxlength="20"
            placeholder="请输入6-20位新密码"
          />
        </view>

        <view class="field">
          <text class="label">确认新密码</text>
          <input
            v-model="passwordForm.confirmPassword"
            class="input"
            type="password"
            maxlength="20"
            placeholder="请再次输入新密码"
          />
        </view>

        <view class="modal-actions">
          <button class="outline-btn" @click="closePasswordModal">取消</button>
          <button class="primary-btn" :loading="submitting" @click="handleChangePassword">确认修改</button>
        </view>
      </view>
    </view>

    <view class="version-row">
      <text class="version-text">版本号 1.0.0</text>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { createSaltedPassword, generateSalt, verifySaltedPassword } from "../../utils/md5"
import {
  clearCurrentUser,
  deleteUserAccount,
  getCurrentUser,
  getUserByUsername,
  getUserList,
  updateUserPassword
} from "../../utils/storage"

const currentUser = ref("")
const submitting = ref(false)
const showPasswordModal = ref(false)
const passwordForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
})

function resetPasswordForm() {
  passwordForm.oldPassword = ""
  passwordForm.newPassword = ""
  passwordForm.confirmPassword = ""
}

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function syncCurrentUser() {
  currentUser.value = getCurrentUser() || ""
  if (!currentUser.value) {
    uni.reLaunch({
      url: getUserList().length ? "/pages/login/login" : "/pages/login/login?tab=register"
    })
  }
}

function goTo(url) {
  uni.navigateTo({
    url
  })
}

function openPasswordModal() {
  showPasswordModal.value = true
}

function closePasswordModal() {
  showPasswordModal.value = false
  resetPasswordForm()
}

onShow(() => {
  syncCurrentUser()
})

function handleLogout() {
  clearCurrentUser()
  uni.reLaunch({
    url: "/pages/login/login"
  })
}

function handleDeleteAccount() {
  if (!currentUser.value) {
    syncCurrentUser()
    return
  }

  uni.showModal({
    title: "确认注销",
    content: `注销后将删除 ${currentUser.value} 的所有本地数据，且无法恢复。`,
    confirmColor: "#E74C3C",
    success: ({ confirm }) => {
      if (!confirm) {
        return
      }

      const deleted = deleteUserAccount(currentUser.value)
      if (!deleted) {
        showToast("注销失败，请稍后重试")
        return
      }

      const hasUsers = getUserList().length > 0
      uni.showToast({
        title: "账号已注销",
        icon: "success"
      })

      setTimeout(() => {
        uni.reLaunch({
          url: hasUsers ? "/pages/login/login" : "/pages/login/login?tab=register"
        })
      }, 300)
    }
  })
}

function handleChangePassword() {
  if (submitting.value) {
    return
  }

  if (!currentUser.value) {
    syncCurrentUser()
    return
  }

  const user = getUserByUsername(currentUser.value)
  if (!user) {
    showToast("当前账号不存在")
    return
  }

  if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    showToast("请完整填写密码信息")
    return
  }

  if (passwordForm.newPassword.length < 6 || passwordForm.newPassword.length > 20) {
    showToast("新密码长度需为6-20位")
    return
  }

  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    showToast("两次输入的新密码不一致")
    return
  }

  if (!verifySaltedPassword(passwordForm.oldPassword, user.salt, user.passwordHash)) {
    showToast("旧密码不正确")
    return
  }

  submitting.value = true

  const salt = generateSalt()
  const passwordHash = createSaltedPassword(passwordForm.newPassword, salt)
  const updated = updateUserPassword(currentUser.value, passwordHash, salt)

  submitting.value = false

  if (!updated) {
    showToast("密码修改失败")
    return
  }

  closePasswordModal()
  uni.showToast({
    title: "密码已更新",
    icon: "success"
  })
}

</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
}

.hero-card,
.section-card,
.modal-card {
  border-radius: 28rpx;
  background: var(--bg-card);
  box-shadow: 0 20rpx 50rpx rgba(31, 41, 51, 0.08);
}

.hero-card {
  padding: 34rpx 28rpx;
}

.eyebrow {
  display: inline-block;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(43, 122, 75, 0.1);
  color: var(--color-primary);
  font-size: 24rpx;
}

.username {
  display: block;
  margin-top: 24rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.tips {
  display: block;
  margin-top: 14rpx;
  color: var(--text-secondary);
  font-size: 26rpx;
  line-height: 1.7;
}

.action-row {
  display: flex;
  gap: 20rpx;
  margin-top: 28rpx;
}

.action-row button {
  flex: 1;
  border-radius: 18rpx;
  font-size: 28rpx;
}

.outline-btn {
  background: transparent;
  color: var(--color-primary);
  border: 2rpx solid rgba(43, 122, 75, 0.18);
}

.danger-btn {
  background: rgba(231, 76, 60, 0.12);
  color: var(--color-danger);
  border: 2rpx solid rgba(231, 76, 60, 0.08);
}

.section-card {
  margin-top: 24rpx;
  padding: 32rpx 28rpx;
}

.section-head {
  margin-bottom: 20rpx;
}

.section-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-primary);
}

.section-desc {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: var(--text-secondary);
}

.nav-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 24rpx 22rpx;
  border-radius: 22rpx;
  background: rgba(31, 122, 77, 0.06);
}

.nav-title {
  display: block;
  font-size: 30rpx;
  color: var(--text-primary);
}

.nav-desc {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: var(--text-secondary);
}

.nav-arrow {
  font-size: 44rpx;
  color: var(--color-primary);
  line-height: 1;
}

.primary-btn {
  border-radius: 20rpx;
  font-size: 30rpx;
  background: var(--color-primary);
  color: #fff;
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
  padding: 28rpx;
}

.modal-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.modal-close {
  font-size: 42rpx;
  color: var(--text-secondary);
}

.field {
  margin-top: 18rpx;
}

.label {
  display: block;
  margin-bottom: 10rpx;
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

.modal-actions {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.modal-actions button {
  flex: 1;
}

.version-row {
  margin-top: 28rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
}

.version-text {
  font-size: 24rpx;
  color: var(--text-secondary);
  opacity: 0.85;
}
</style>
