<template>
  <view class="auth-page">
    <view class="hero">
      <text class="brand">钱多多</text>
      <text class="headline">欢迎回来</text>
      <text class="subhead">登录后继续使用你的本地账本，所有数据仍保存在当前设备。</text>
    </view>

    <view class="panel">
      <view class="field">
        <text class="label">用户名</text>
        <input
          v-model.trim="form.username"
          class="input"
          type="text"
          maxlength="20"
          placeholder="请输入用户名"
        />
      </view>

      <view class="field">
        <text class="label">密码</text>
        <input
          v-model="form.password"
          class="input"
          type="password"
          maxlength="20"
          placeholder="请输入密码"
        />
      </view>

      <button class="primary-btn" :loading="submitting" @click="handleLogin">登录</button>
      <button class="ghost-btn" @click="goToRegister">没有账号，去注册</button>
    </view>
  </view>
</template>

<script setup>
import { reactive, ref } from "vue"
import { verifySaltedPassword } from "../../utils/md5"
import { getUserByUsername, setCurrentUser } from "../../utils/storage"

const form = reactive({
  username: "",
  password: ""
})

const submitting = ref(false)

function showToast(title) {
  uni.showToast({
    title,
    icon: "none"
  })
}

function goToRegister() {
  uni.navigateTo({
    url: "/pages/login/register"
  })
}

function handleLogin() {
  if (submitting.value) {
    return
  }

  if (!form.username || !form.password) {
    showToast("请输入用户名和密码")
    return
  }

  const user = getUserByUsername(form.username)
  if (!user) {
    showToast("用户名不存在")
    return
  }

  submitting.value = true

  const matched = verifySaltedPassword(form.password, user.salt, user.passwordHash)
  submitting.value = false

  if (!matched) {
    showToast("密码错误")
    return
  }

  setCurrentUser(user.username)
  uni.showToast({
    title: "登录成功",
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
    radial-gradient(circle at top right, rgba(43, 122, 75, 0.18), transparent 34%),
    linear-gradient(180deg, #eef7f1 0%, #f8f9fa 42%, #f8f9fa 100%);
}

.hero {
  padding: 72rpx 8rpx 32rpx;
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
