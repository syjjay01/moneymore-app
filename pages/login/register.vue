<template>
  <view class="auth-page">
    <view class="hero">
      <text class="brand">钱多多</text>
      <text class="headline">创建你的本地账本</text>
      <text class="subhead">数据只留在当前设备，注册后会自动进入记账页。</text>
    </view>

    <view class="panel">
      <view class="field">
        <text class="label">用户名</text>
        <input
          v-model.trim="form.username"
          class="input"
          type="text"
          maxlength="20"
          placeholder="4-20位字母、数字或下划线"
        />
      </view>

      <view class="field">
        <text class="label">密码</text>
        <input
          v-model="form.password"
          class="input"
          type="password"
          maxlength="20"
          placeholder="6-20位密码"
        />
      </view>

      <view class="field">
        <text class="label">确认密码</text>
        <input
          v-model="form.confirmPassword"
          class="input"
          type="password"
          maxlength="20"
          placeholder="再次输入密码"
        />
      </view>

      <button class="primary-btn" :loading="submitting" @click="handleRegister">注册并开始使用</button>
      <button class="ghost-btn" @click="goToLogin">已有账号，去登录</button>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from "vue"
import { generateSalt, createSaltedPassword } from "../../utils/md5"
import { getUserByUsername, registerUser, setCurrentUser } from "../../utils/storage"

const form = reactive({
  username: "",
  password: "",
  confirmPassword: ""
})

const submitting = ref(false)
const usernamePattern = /^[A-Za-z0-9_]{4,20}$/

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function validateForm() {
  if (!usernamePattern.test(form.username)) {
    showToast("用户名需为4-20位字母数字下划线")
    return false
  }

  if (getUserByUsername(form.username)) {
    showToast("用户名已存在")
    return false
  }

  if (form.password.length < 6 || form.password.length > 20) {
    showToast("密码长度需为6-20位")
    return false
  }

  if (form.password !== form.confirmPassword) {
    showToast("两次输入的密码不一致")
    return false
  }

  return true
}

function goToLogin() {
  uni.navigateTo({
    url: "/pages/login/login"
  })
}

function handleRegister() {
  if (submitting.value || !validateForm()) {
    return
  }

  submitting.value = true

  const salt = generateSalt()
  const passwordHash = createSaltedPassword(form.password, salt)
  const result = registerUser({
    username: form.username,
    passwordHash,
    salt
  })

  submitting.value = false

  if (!result.success) {
    showToast(result.message || "注册失败")
    return
  }

  setCurrentUser(form.username)
  uni.showToast({
    title: "注册成功",
    icon: "success"
  })

  setTimeout(() => {
    uni.switchTab({
      url: "/pages/record/record"
    })
  }, 300)
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  padding: 48rpx 32rpx;
  background:
    radial-gradient(circle at top left, rgba(43, 122, 75, 0.18), transparent 36%),
    linear-gradient(180deg, #f0f7f2 0%, #f8f9fa 40%, #f8f9fa 100%);
}

.hero {
  padding: 40rpx 8rpx 32rpx;
}

.brand {
  display: inline-block;
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(43, 122, 75, 0.12);
  color: var(--color-primary);
  font-size: 24rpx;
  letter-spacing: 4rpx;
}

.headline {
  display: block;
  margin-top: 24rpx;
  font-size: 56rpx;
  font-weight: 700;
  color: var(--text-primary);
}

.subhead {
  display: block;
  margin-top: 18rpx;
  color: var(--text-secondary);
  font-size: 28rpx;
  line-height: 1.7;
}

.panel {
  padding: 36rpx 28rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 24rpx 60rpx rgba(31, 41, 51, 0.08);
  backdrop-filter: blur(12rpx);
}

.field + .field {
  margin-top: 24rpx;
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

.primary-btn,
.ghost-btn {
  margin-top: 28rpx;
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
</style>
