<template>
  <view class="redirect-page" />
</template>

<script setup>
import { onLoad } from "@dcloudio/uni-app"

onLoad(() => {
  uni.reLaunch({
    url: "/pages/login/login?tab=register"
  })
})
</script>

<style scoped>
.redirect-page {
  min-height: 100vh;
}
</style>
