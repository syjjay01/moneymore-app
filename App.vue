<script>
import { getCurrentUser, getUserList } from "./utils/storage"
import { loadAndApplyAppearance } from "./composables/useAppearance"

function resolveAuthRoute() {
  const userList = getUserList()
  const currentUser = getCurrentUser()
  const hasCurrentUser = userList.some((item) => item.username === currentUser)

  if (!userList.length) {
    return "/pages/login/register"
  }

  if (!currentUser || !hasCurrentUser) {
    return "/pages/login/login"
  }

  return ""
}

function redirectByAuthState() {
  const target = resolveAuthRoute()
  const pages = getCurrentPages()
  const currentRoute = pages.length ? `/${pages[pages.length - 1].route}` : ""
  const authRoutes = ["/pages/login/login", "/pages/login/register"]

  if (!target && authRoutes.includes(currentRoute)) {
    uni.switchTab({
      url: "/pages/record/record"
    })
    return
  }

  if (target && currentRoute !== target) {
    uni.reLaunch({
      url: target
    })
  }
}

export default {
  onLaunch() {
    loadAndApplyAppearance()
    redirectByAuthState()
  },
  onShow() {
    loadAndApplyAppearance()
    redirectByAuthState()
  },
  onHide() {}
}
</script>

<style>
@import "./styles/variables.css";

page {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  color: var(--text-primary);
  background-color: var(--bg-page);
  line-height: 1.5;
}

/* #ifdef H5 */
page {
  zoom: var(--app-scale);
}
/* #endif */

.page {
  background: var(--app-page-gradient) !important;
}

view,
text,
button,
input,
textarea,
picker {
  font-size: var(--font-size-base);
}

.text-primary {
  color: var(--text-primary);
}

.text-secondary {
  color: var(--text-secondary);
}
</style>
