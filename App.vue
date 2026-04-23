<script>
import { getCurrentUser, getUserList } from "./utils/storage"
import { loadAndApplyAppearance } from "./composables/useAppearance"
let authRedirecting = false
let lastRedirectAt = 0

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
  const now = Date.now()
  if (authRedirecting || now - lastRedirectAt < 600) {
    return
  }

  const target = resolveAuthRoute()
  const pages = getCurrentPages()
  if (!pages.length) {
    return
  }

  const currentRoute = `/${pages[pages.length - 1].route}`
  const authRoutes = ["/pages/login/login", "/pages/login/register"]

  if (!target && authRoutes.includes(currentRoute)) {
    authRedirecting = true
    lastRedirectAt = now
    uni.switchTab({
      url: "/pages/record/record",
      complete: () => {
        setTimeout(() => {
          authRedirecting = false
        }, 80)
      }
    })
    return
  }

  if (target && currentRoute !== target) {
    authRedirecting = true
    lastRedirectAt = now
    uni.reLaunch({
      url: target,
      complete: () => {
        setTimeout(() => {
          authRedirecting = false
        }, 80)
      }
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
html,
body,
#app,
page,
.uni-page-body,
.uni-page-wrapper {
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
picker,
label {
  font-size: var(--font-size-base);
}

.text-primary {
  color: var(--text-primary);
}

.text-secondary {
  color: var(--text-secondary);
}
</style>
