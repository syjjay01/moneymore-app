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
    return "/pages/login/login?tab=register"
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
  const targetPath = target ? target.split("?")[0] : ""
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

  if (target && currentRoute !== targetPath) {
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
  line-height: 1.55;
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
label,
uni-view,
uni-text,
uni-button,
uni-input,
uni-textarea,
uni-picker,
uni-label,
.uni-input-input,
.uni-easyinput__content-input,
.uni-textarea-textarea {
  font-size: var(--font-size-base) !important;
  color: var(--text-primary);
}

page *,
.uni-page *,
.uni-page-body * {
  font-size: var(--font-size-base) !important;
}

.text-primary {
  color: var(--text-primary);
}

.text-secondary {
  color: var(--text-secondary);
}

.hero-card,
.section-card,
.form-card,
.list-card,
.top-card,
.card,
.sheet,
.modal-card,
.summary-card,
.budget-card,
.chart-card,
.insight-card {
  background: var(--bg-card) !important;
  box-shadow: var(--shadow-card) !important;
  border: 1rpx solid var(--line-soft) !important;
}

.hero-desc,
.section-desc,
.item-meta,
.tips,
.month-tip,
.card-desc,
.budget-desc,
.budget-note,
.detail-note,
.detail-time,
.field-label,
.label {
  color: var(--text-secondary) !important;
}

.hero-title,
.section-title,
.card-title,
.item-name,
.username,
.month-label,
.sheet-title,
.modal-title,
.budget-title,
.summary-value,
.insight-title {
  color: var(--text-primary) !important;
}

.primary-btn,
.mini-primary {
  background: var(--color-primary) !important;
  color: #fff !important;
}

.outline-btn,
.ghost-btn {
  background: transparent !important;
  color: var(--color-primary) !important;
  border-color: rgba(47, 143, 99, 0.28) !important;
}

.danger-btn,
.danger-link,
.row-delete {
  color: var(--color-danger) !important;
}

.field-input,
.input,
.picker-inline,
.amount-input {
  background: var(--bg-soft) !important;
  border: 1rpx solid var(--line-soft) !important;
  color: var(--text-primary) !important;
}

.tab-item {
  background: var(--bg-soft) !important;
  color: var(--text-secondary) !important;
}

.tab-item.active {
  background: var(--color-primary) !important;
  color: #fff !important;
}

.tag-chip {
  background: var(--bg-soft) !important;
  color: var(--text-secondary) !important;
}

.tag-chip.active {
  background: var(--color-primary) !important;
  color: #fff !important;
}

.warning-banner {
  border: 1rpx solid rgba(223, 90, 78, 0.26) !important;
}
</style>
