<template>
  <view class="auth-page">
    <view class="hero">
      <view class="brand-slot">
        <view class="brand-logo">
          <image class="brand-icon" src="/static/app-icon.png" mode="aspectFit" />
          <text class="brand-wordmark">钱多多</text>
        </view>
      </view>
      <text class="headline">{{ activeTab === 'login' ? '欢迎回来' : '创建你的本地账本' }}</text>
      <text class="subhead">{{ activeTab === 'login' ? '登录后继续使用你的本地账本，所有数据仅保存在当前设备。' : '数据只保存在当前设备，注册后会自动进入记账页。' }}</text>
    </view>

    <view class="panel">
      <view class="auth-tabs">
        <view class="auth-tab" :class="{ active: activeTab === 'login' }" @click="switchTab('login')">登录</view>
        <view class="auth-tab" :class="{ active: activeTab === 'register' }" @click="switchTab('register')">注册</view>
      </view>

      <view v-if="activeTab === 'login'">
        <view class="field">
          <text class="label">用户名</text>
          <input
            v-model.trim="loginForm.username"
            class="input"
            type="text"
            maxlength="20"
            placeholder="请输入用户名"
          />
        </view>

        <view class="field">
          <text class="label">密码</text>
          <input v-model="loginForm.password" class="input" type="password" maxlength="20" placeholder="请输入密码" />
        </view>

        <button class="primary-btn" :loading="submitting" @click="handleLogin">登录</button>
        <button class="ghost-btn" @click="switchTab('register')">没有账号，去注册</button>
      </view>

      <view v-else>
        <view class="field">
          <text class="label">用户名</text>
          <input
            v-model.trim="registerForm.username"
            class="input"
            type="text"
            maxlength="20"
            placeholder="4-20位字母、数字或下划线"
          />
        </view>

        <view class="field">
          <text class="label">密码</text>
          <input
            v-model="registerForm.password"
            class="input"
            type="password"
            maxlength="20"
            placeholder="6-20位密码"
          />
        </view>

        <view class="field">
          <text class="label">确认密码</text>
          <input
            v-model="registerForm.confirmPassword"
            class="input"
            type="password"
            maxlength="20"
            placeholder="再次输入密码"
          />
        </view>

        <button class="primary-btn" :loading="submitting" @click="handleRegister">注册并开始使用</button>
        <button class="ghost-btn" @click="switchTab('login')">已有账号，去登录</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from "vue"
import { onLoad } from "@dcloudio/uni-app"
import { verifySaltedPassword, generateSalt, createSaltedPassword } from "../../utils/md5"
import { getUserByUsername, registerUser, setCurrentUser } from "../../utils/storage"

const activeTab = ref("login")
const submitting = ref(false)
const usernamePattern = /^[A-Za-z0-9_]{4,20}$/

const loginForm = reactive({
  username: "",
  password: ""
})

const registerForm = reactive({
  username: "",
  password: "",
  confirmPassword: ""
})

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function switchTab(tab) {
  activeTab.value = tab === "register" ? "register" : "login"
}

function goRecord() {
  setTimeout(() => {
    uni.switchTab({
      url: "/pages/record/record"
    })
  }, 300)
}

function handleLogin() {
  if (submitting.value) {
    return
  }

  if (!loginForm.username || !loginForm.password) {
    showToast("请输入用户名和密码")
    return
  }

  const user = getUserByUsername(loginForm.username)
  if (!user) {
    showToast("用户名不存在，请先注册")
    registerForm.username = loginForm.username
    switchTab("register")
    return
  }

  submitting.value = true
  const matched = verifySaltedPassword(loginForm.password, user.salt, user.passwordHash)
  submitting.value = false

  if (!matched) {
    showToast("密码错误")
    return
  }

  setCurrentUser(user.username)
  uni.showToast({ title: "登录成功", icon: "success" })
  goRecord()
}

function validateRegisterForm() {
  if (!usernamePattern.test(registerForm.username)) {
    showToast("用户名需为4-20位字母数字下划线")
    return false
  }

  if (getUserByUsername(registerForm.username)) {
    showToast("用户名已存在")
    return false
  }

  if (registerForm.password.length < 6 || registerForm.password.length > 20) {
    showToast("密码长度需为6-20位")
    return false
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    showToast("两次输入的密码不一致")
    return false
  }

  return true
}

function handleRegister() {
  if (submitting.value || !validateRegisterForm()) {
    return
  }

  submitting.value = true

  const salt = generateSalt()
  const passwordHash = createSaltedPassword(registerForm.password, salt)
  const result = registerUser({
    username: registerForm.username,
    passwordHash,
    salt
  })

  submitting.value = false

  if (!result.success) {
    showToast(result.message || "注册失败")
    return
  }

  setCurrentUser(registerForm.username)
  uni.showToast({ title: "注册成功", icon: "success" })
  goRecord()
}

onLoad((options) => {
  if (options?.tab === "register") {
    switchTab("register")
  }
})
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  padding: 48rpx 32rpx;
  background:
    radial-gradient(circle at top right, rgba(43, 122, 75, 0.18), transparent 34%),
    linear-gradient(180deg, #eef7f1 0%, #f8f9fa 42%, #f8f9fa 100%);
}

.hero {
  padding: 56rpx 8rpx 32rpx;
}

.brand-slot {
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo {
  width: auto;
  margin: 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex-wrap: nowrap;
}

.brand-icon {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
}

.brand-wordmark {
  font-size: 44rpx;
  line-height: 1;
  letter-spacing: 1rpx;
  font-weight: 800;
  color: var(--color-primary);
  font-family: "STKaiti", "FZYaoti", "KaiTi", "STSong", "PingFang SC", "Microsoft YaHei", serif;
  white-space: nowrap;
}

.headline {
  display: block;
  margin-top: 16rpx;
  font-size: 52rpx;
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

.auth-tabs {
  margin-bottom: 12rpx;
  display: flex;
  gap: 12rpx;
  padding: 8rpx;
  border-radius: 18rpx;
  background: rgba(43, 122, 75, 0.08);
}

.auth-tab {
  flex: 1;
  height: 68rpx;
  line-height: 68rpx;
  text-align: center;
  border-radius: 14rpx;
  color: var(--text-secondary);
  font-size: 28rpx;
}

.auth-tab.active {
  background: #fff;
  color: var(--color-primary);
  font-weight: 700;
  box-shadow: 0 10rpx 20rpx rgba(31, 41, 51, 0.08);
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
